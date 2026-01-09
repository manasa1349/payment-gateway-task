import { pool } from "../config/db.js";
import { isValidVPA } from "../utils/vpa.js";
import { isValidCardNumber } from "../utils/luhn.js";
import { detectCardNetwork } from "../utils/card.network.js";
import { isValidExpiry } from "./validation.service.js";
import { env } from "../config/env.js";

function generatePaymentId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `pay_${random}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createPayment({ merchant, order, body }) {
  const { method } = body;

  let paymentData = {
    id: generatePaymentId(),
    order_id: order.id,
    merchant_id: merchant.id,
    amount: order.amount,
    currency: order.currency,
    method,
    status: "processing"
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

  // -------- Insert Payment (processing) --------

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

  // -------- Processing Delay --------

  let delay = Math.floor(
    Math.random() *
      ((env.PROCESSING_DELAY_MAX || 10000) -
        (env.PROCESSING_DELAY_MIN || 5000)) +
      (env.PROCESSING_DELAY_MIN || 5000)
  );

  let success = Math.random() < (method === "upi" ? 0.9 : 0.95);

  if (env.TEST_MODE) {
    delay = env.TEST_PROCESSING_DELAY || 1000;
    success = env.TEST_PAYMENT_SUCCESS;
  }

  await sleep(delay);

  // -------- Final Status --------

  if (success) {
    await pool.query(
      `UPDATE payments SET status='success', updated_at=NOW() WHERE id=$1`,
      [paymentData.id]
    );
  } else {
    await pool.query(
      `UPDATE payments
       SET status='failed',
           error_code='PAYMENT_FAILED',
           error_description='Payment processing failed',
           updated_at=NOW()
       WHERE id=$1`,
      [paymentData.id]
    );
  }

  // Fetch the complete payment record
  const finalResult = await pool.query(
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
      error_code,
      error_description,
      created_at,
      updated_at
    FROM payments
    WHERE id = $1`,
    [paymentData.id]
  );

  const finalPayment = finalResult.rows[0];
  
  // Format timestamps to ISO strings and build response
  const response = {
    id: finalPayment.id,
    order_id: finalPayment.order_id,
    amount: finalPayment.amount,
    currency: finalPayment.currency,
    method: finalPayment.method,
    status: finalPayment.status,
    created_at: finalPayment.created_at ? new Date(finalPayment.created_at).toISOString() : undefined
  };

  // Add method-specific fields
  if (finalPayment.method === "upi" && finalPayment.vpa) {
    response.vpa = finalPayment.vpa;
  }

  if (finalPayment.method === "card") {
    if (finalPayment.card_network) response.card_network = finalPayment.card_network;
    if (finalPayment.card_last4) response.card_last4 = finalPayment.card_last4;
  }

  // Add error fields if payment failed
  if (finalPayment.status === "failed") {
    if (finalPayment.error_code) response.error_code = finalPayment.error_code;
    if (finalPayment.error_description) response.error_description = finalPayment.error_description;
  }

  return response;
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
