import { pool } from './config/db.js';
import { paymentQueue, webhookQueue, refundQueue } from './config/queue.js';
import { generateWebhookSignature, getNextRetryTime } from './utils/webhook.js';
import { env } from './config/env.js';
import fetch from 'node-fetch';
import { createWebhookLogAndEnqueue } from './services/webhook.service.js';

console.log('🚀 Starting Payment Gateway Worker...');

// ========================
// PAYMENT WORKER
// ========================
paymentQueue.process(async (job) => {
  const { paymentId } = job.data;
  console.log(`[PAYMENT] Processing payment ${paymentId}`);

  try {
    // Fetch payment
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const payment = paymentResult.rows[0];

    // Simulate processing delay
    let delayMs;
    if (env.TEST_MODE) {
      delayMs = Number(env.TEST_PROCESSING_DELAY || 1000);
    } else {
      const min = Number(env.PROCESSING_DELAY_MIN || 5000);
      const max = Number(env.PROCESSING_DELAY_MAX || 10000);
      delayMs = Math.random() * (max - min) + min; // default: 5-10 seconds
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Determine success based on method and test mode
    let isSuccess;
    if (env.TEST_MODE) {
      isSuccess = Boolean(env.TEST_PAYMENT_SUCCESS);
    } else {
      const successRate = payment.method === 'upi' ? 0.9 : 0.95;
      isSuccess = Math.random() < successRate;
    }

    // Update payment status
    if (isSuccess) {
      await pool.query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
        ['success', paymentId]
      );
      console.log(`[PAYMENT] ✅ Payment ${paymentId} succeeded`);

      // Enqueue webhook log + delivery (single log row, retries handled by worker)
      const updatedPaymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
      await createWebhookLogAndEnqueue({
        merchantId: payment.merchant_id,
        event: 'payment.success',
        payload: {
          event: 'payment.success',
          timestamp: Math.floor(Date.now() / 1000),
          data: { payment: updatedPaymentResult.rows[0] }
        }
      });
    } else {
      const errorCode = 'PAYMENT_DECLINED';
      const errorDescription = 'Payment declined by bank';
      
      await pool.query(
        'UPDATE payments SET status = $1, error_code = $2, error_description = $3, updated_at = NOW() WHERE id = $4',
        ['failed', errorCode, errorDescription, paymentId]
      );
      console.log(`[PAYMENT] ❌ Payment ${paymentId} failed`);

      // Fetch updated payment for webhook
      const updatedPaymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);

      await createWebhookLogAndEnqueue({
        merchantId: payment.merchant_id,
        event: 'payment.failed',
        payload: {
          event: 'payment.failed',
          timestamp: Math.floor(Date.now() / 1000),
          data: { payment: updatedPaymentResult.rows[0] }
        }
      });
    }

    return { success: true, paymentId };
  } catch (error) {
    console.error(`[PAYMENT] Error processing ${paymentId}:`, error);
    throw error;
  }
});

// ========================
// WEBHOOK WORKER
// ========================
webhookQueue.process(async (job) => {
  const { logId } = job.data;
  console.log(`[WEBHOOK] Delivering webhook log ${logId}`);

  try {
    const logResult = await pool.query(
      "SELECT * FROM webhook_logs WHERE id = $1",
      [logId]
    );
    if (logResult.rows.length === 0) {
      console.log(`[WEBHOOK] Log ${logId} not found; skipping`);
      return { skipped: true };
    }

    const log = logResult.rows[0];
    if (log.status === "success" || log.status === "failed") {
      return { skipped: true };
    }

    const merchantResult = await pool.query("SELECT * FROM merchants WHERE id = $1", [log.merchant_id]);
    if (merchantResult.rows.length === 0) throw new Error(`Merchant ${log.merchant_id} not found`);
    const merchant = merchantResult.rows[0];

    if (!merchant.webhook_url) {
      console.log(`[WEBHOOK] No webhook URL configured for merchant ${merchant.id}; skipping`);
      return { skipped: true };
    }

    const payload = log.payload;
    const payloadString = JSON.stringify(payload);
    const signature = generateWebhookSignature(payload, merchant.webhook_secret);

    const response = await fetch(merchant.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature
      },
      body: payloadString,
      timeout: 5000
    });

    const responseBody = await response.text();
    const isSuccess = response.status >= 200 && response.status < 300;

    // Increment attempts, update timestamps + response info
    const attemptsMade = (log.attempts || 0) + 1;

    if (isSuccess) {
      await pool.query(
        `UPDATE webhook_logs
         SET status = 'success',
             attempts = $1,
             last_attempt_at = NOW(),
             next_retry_at = NULL,
             response_code = $2,
             response_body = $3
         WHERE id = $4`,
        [attemptsMade, response.status, responseBody, logId]
      );
      console.log(`[WEBHOOK] ✅ ${log.event} delivered to ${merchant.webhook_url}`);
      return { success: true, logId };
    }

    const nextRetryAt = getNextRetryTime(attemptsMade);
    if (attemptsMade >= 5 || !nextRetryAt) {
      await pool.query(
        `UPDATE webhook_logs
         SET status = 'failed',
             attempts = $1,
             last_attempt_at = NOW(),
             next_retry_at = NULL,
             response_code = $2,
             response_body = $3
         WHERE id = $4`,
        [attemptsMade, response.status, responseBody, logId]
      );
      console.log(`[WEBHOOK] ❌ ${log.event} failed after 5 attempts`);
      return { failed: true, logId };
    }

    await pool.query(
      `UPDATE webhook_logs
       SET status = 'pending',
           attempts = $1,
           last_attempt_at = NOW(),
           next_retry_at = $2,
           response_code = $3,
           response_body = $4
       WHERE id = $5`,
      [attemptsMade, nextRetryAt, response.status, responseBody, logId]
    );

    const delayMs = Math.max(0, nextRetryAt.getTime() - Date.now());
    await webhookQueue.add(
      { logId },
      { attempts: 1, delay: delayMs, removeOnComplete: false, removeOnFail: false }
    );

    console.log(`[WEBHOOK] ⏳ Scheduled retry for ${log.event} at ${nextRetryAt.toISOString()}`);
    return { scheduled: true, logId };
  } catch (error) {
    console.error(`[WEBHOOK] Error processing log ${logId}:`, error);
    throw error;
  }
});

// ========================
// REFUND WORKER
// ========================
refundQueue.process(async (job) => {
  const { refundId } = job.data;
  console.log(`[REFUND] Processing refund ${refundId}`);

  try {
    // Fetch refund
    const refundResult = await pool.query(
      'SELECT * FROM refunds WHERE id = $1',
      [refundId]
    );

    if (refundResult.rows.length === 0) {
      throw new Error(`Refund ${refundId} not found`);
    }

    const refund = refundResult.rows[0];

    // Fetch payment
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [refund.payment_id]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error(`Payment ${refund.payment_id} not found`);
    }

    const payment = paymentResult.rows[0];

    // Verify payment is refundable
    if (payment.status !== 'success') {
      throw new Error('Payment is not refundable');
    }

    // Simulate refund processing
    const delayMs = Math.random() * 2000 + 3000; // 3-5 seconds
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Update refund status
    await pool.query(
      'UPDATE refunds SET status = $1, processed_at = NOW() WHERE id = $2',
      ['processed', refundId]
    );

    console.log(`[REFUND] ✅ Refund ${refundId} processed`);

    const updatedRefundResult = await pool.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
    await createWebhookLogAndEnqueue({
      merchantId: refund.merchant_id,
      event: 'refund.processed',
      payload: {
        event: 'refund.processed',
        timestamp: Math.floor(Date.now() / 1000),
        data: { refund: updatedRefundResult.rows[0] }
      }
    });

    return { success: true, refundId };
  } catch (error) {
    console.error(`[REFUND] Error processing ${refundId}:`, error);
    throw error;
  }
});

// ========================
// EVENT LISTENERS
// ========================
paymentQueue.on('completed', (job) => {
  console.log(`[QUEUE] Payment job ${job.id} completed`);
});

paymentQueue.on('failed', (job, err) => {
  console.log(`[QUEUE] Payment job ${job.id} failed:`, err.message);
});

webhookQueue.on('completed', (job) => {
  console.log(`[QUEUE] Webhook job ${job.id} completed`);
});

webhookQueue.on('failed', (job, err) => {
  console.log(`[QUEUE] Webhook job ${job.id} failed:`, err.message);
});

refundQueue.on('completed', (job) => {
  console.log(`[QUEUE] Refund job ${job.id} completed`);
});

refundQueue.on('failed', (job, err) => {
  console.log(`[QUEUE] Refund job ${job.id} failed:`, err.message);
});

console.log('✅ Worker initialized and listening for jobs');
