import { pool } from "../config/db.js";
import { isValidVPA } from "../utils/vpa.js";
import { isValidCardNumber } from "../utils/luhn.js";
import { detectCardNetwork } from "../utils/card.network.js";
import { isValidExpiry } from "./validation.service.js";
import { enqueuePaymentJob, enqueueRefundJob } from "../config/queue.js";
import { createWebhookLogAndEnqueue } from "./webhook.service.js";

function generatePaymentId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `pay_${random}`;
}

function generateRefundId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `rfnd_${random}`;
}

async function generateUniqueId({ prefix, generator, table }) {
  for (let i = 0; i < 5; i++) {
    const id = generator();
    const exists = await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
    if (exists.rows.length === 0) return id;
  }
  // Extremely unlikely, but avoids infinite loop.
  throw new Error(`Failed to generate unique ${prefix} id`);
}

export async function createPayment({ merchant, order, body, idempotencyKey }) {
  const { method } = body;

  // Check idempotency key if provided
  if (idempotencyKey) {
    const existingResult = await pool.query(
      `SELECT response FROM idempotency_keys 
       WHERE key = $1 AND merchant_id = $2 AND expires_at > NOW()`,
      [idempotencyKey, merchant.id]
    );

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].response;
    }

    // Delete expired key if found
    await pool.query(
      `DELETE FROM idempotency_keys 
       WHERE key = $1 AND merchant_id = $2 AND expires_at <= NOW()`,
      [idempotencyKey, merchant.id]
    );
  }

  let paymentData = {
    id: await generateUniqueId({ prefix: "payment", generator: generatePaymentId, table: "payments" }),
    order_id: order.id,
    merchant_id: merchant.id,
    amount: order.amount,
    currency: order.currency,
    method,
    status: "pending"
  };

  // -------- Method Validation --------

  if (method === "upi") {
    if (!body.vpa || !isValidVPA(body.vpa)) {
      return {
        error: {
          code: "INVALID_VPA",
          description: "VPA format invalid"
        }
      };
    }
    paymentData.vpa = body.vpa;
  }

  else if (method === "card") {
    const card = body.card;
    if (!card) {
      return {
        error: {
          code: "INVALID_CARD",
          description: "Card details missing"
        }
      };
    }

    if (!isValidCardNumber(card.number)) {
      return {
        error: {
          code: "INVALID_CARD",
          description: "Card validation failed"
        }
      };
    }

    if (!isValidExpiry(card.expiry_month, card.expiry_year)) {
      return {
        error: {
          code: "EXPIRED_CARD",
          description: "Card expiry date invalid"
        }
      };
    }

    paymentData.card_network = detectCardNetwork(card.number);
    paymentData.card_last4 = card.number.slice(-4);
  }

  else {
    return {
      error: {
        code: "BAD_REQUEST_ERROR",
        description: "Unsupported payment method"
      }
    };
  }

  // -------- Insert Payment (pending status) --------

  await pool.query(
    `INSERT INTO payments
     (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      paymentData.id,
      paymentData.order_id,
      paymentData.merchant_id,
      paymentData.amount,
      paymentData.currency,
      paymentData.method,
      paymentData.status,
      paymentData.vpa || null,
      paymentData.card_network || null,
      paymentData.card_last4 || null
    ]
  );

  // Emit webhook events (created + pending) if configured
  const basePaymentForWebhook = {
    id: paymentData.id,
    order_id: paymentData.order_id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    method: paymentData.method,
    status: paymentData.status,
    vpa: paymentData.vpa || null,
    card_network: paymentData.card_network || null,
    card_last4: paymentData.card_last4 || null,
    created_at: new Date().toISOString()
  };

  try {
    await createWebhookLogAndEnqueue({
      merchantId: merchant.id,
      event: "payment.created",
      payload: {
        event: "payment.created",
        timestamp: Math.floor(Date.now() / 1000),
        data: { payment: basePaymentForWebhook }
      }
    });
    await createWebhookLogAndEnqueue({
      merchantId: merchant.id,
      event: "payment.pending",
      payload: {
        event: "payment.pending",
        timestamp: Math.floor(Date.now() / 1000),
        data: { payment: basePaymentForWebhook }
      }
    });
  } catch (e) {
    console.error("Failed to enqueue payment created/pending webhooks:", e);
  }

  // Enqueue async payment processing job
  try {
    await enqueuePaymentJob(paymentData.id);
  } catch (queueError) {
    console.error('Failed to enqueue payment job:', queueError);
  }

  // Build response
  const response = {
    id: paymentData.id,
    order_id: paymentData.order_id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    method: paymentData.method,
    status: paymentData.status,
    created_at: new Date().toISOString()
  };

  // Add method-specific fields
  if (paymentData.method === "upi" && paymentData.vpa) {
    response.vpa = paymentData.vpa;
  }

  if (paymentData.method === "card") {
    if (paymentData.card_network) response.card_network = paymentData.card_network;
    if (paymentData.card_last4) response.card_last4 = paymentData.card_last4;
  }

  // Store idempotency key if provided
  if (idempotencyKey) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await pool.query(
      `INSERT INTO idempotency_keys (key, merchant_id, response, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key, merchant_id) DO UPDATE
       SET response = $3, expires_at = $4`,
      [idempotencyKey, merchant.id, JSON.stringify(response), expiresAt]
    );
  }

  return response;
}

export async function capturePayment({ paymentId, merchantId, amount }) {
  const payment = await pool.query(
    'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
    [paymentId, merchantId]
  );

  if (payment.rows.length === 0) {
    return { error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } };
  }

  const paymentRecord = payment.rows[0];

  if (paymentRecord.status !== 'success') {
    return { error: { code: 'BAD_REQUEST_ERROR', description: 'Payment not in capturable state' } };
  }

  if (amount > paymentRecord.amount) {
    return { error: { code: 'BAD_REQUEST_ERROR', description: 'Capture amount exceeds payment amount' } };
  }

  // Update captured field
  await pool.query(
    'UPDATE payments SET captured = true, updated_at = NOW() WHERE id = $1',
    [paymentId]
  );

  // Fetch updated payment
  const updated = await pool.query(
    'SELECT * FROM payments WHERE id = $1',
    [paymentId]
  );

  const p = updated.rows[0];
  return {
    id: p.id,
    order_id: p.order_id,
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    status: p.status,
    captured: p.captured,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString()
  };
}

export async function createRefund({ paymentId, merchantId, amount, reason }) {
  // Fetch payment
  const paymentResult = await pool.query(
    'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
    [paymentId, merchantId]
  );

  if (paymentResult.rows.length === 0) {
    return { error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } };
  }

  const payment = paymentResult.rows[0];

  // Verify payment is refundable
  if (payment.status !== 'success') {
    return { error: { code: 'BAD_REQUEST_ERROR', description: 'Payment must be successful to refund' } };
  }

  // Calculate total already refunded
  const refundsResult = await pool.query(
    'SELECT SUM(amount) as total FROM refunds WHERE payment_id = $1 AND (status = $2 OR status = $3)',
    [paymentId, 'processed', 'pending']
  );

  const totalRefunded = refundsResult.rows[0].total || 0;

  // Validate refund amount
  if (amount + totalRefunded > payment.amount) {
    return { error: { code: 'BAD_REQUEST_ERROR', description: 'Refund amount exceeds available amount' } };
  }

  // Generate refund ID
  const refundId = await generateUniqueId({ prefix: "refund", generator: generateRefundId, table: "refunds" });

  // Create refund record
  await pool.query(
    `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [refundId, paymentId, merchantId, amount, reason || null]
  );

  // Emit refund.created webhook if configured
  try {
    await createWebhookLogAndEnqueue({
      merchantId,
      event: "refund.created",
      payload: {
        event: "refund.created",
        timestamp: Math.floor(Date.now() / 1000),
        data: {
          refund: {
            id: refundId,
            payment_id: paymentId,
            amount,
            reason: reason || null,
            status: "pending",
            created_at: new Date().toISOString()
          }
        }
      }
    });
  } catch (e) {
    console.error("Failed to enqueue refund.created webhook:", e);
  }

  // Enqueue refund processing job
  try {
    await enqueueRefundJob(refundId);
  } catch (queueError) {
    console.error('Failed to enqueue refund job:', queueError);
  }

  return {
    id: refundId,
    payment_id: paymentId,
    amount,
    reason,
    status: 'pending',
    created_at: new Date().toISOString()
  };
}

export async function getRefund({ refundId, merchantId }) {
  const result = await pool.query(
    'SELECT * FROM refunds WHERE id = $1 AND merchant_id = $2',
    [refundId, merchantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const r = result.rows[0];
  return {
    id: r.id,
    payment_id: r.payment_id,
    amount: r.amount,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at.toISOString(),
    processed_at: r.processed_at ? r.processed_at.toISOString() : null
  };
}

export async function getPaymentById({ paymentId, merchantId }) {
  const result = await pool.query(
    `SELECT
        id,
        order_id,
        amount,
        currency,
        method,
        status,
        vpa,
        card_network,
        card_last4,
        captured,
        error_code,
        error_description,
        created_at,
        updated_at
     FROM payments
     WHERE id = $1 AND merchant_id = $2`,
    [paymentId, merchantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export default {
  createPayment,
  capturePayment,
  createRefund,
  getRefund,
  getPaymentById
};
