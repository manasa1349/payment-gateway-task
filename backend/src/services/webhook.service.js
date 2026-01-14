import { pool } from "../config/db.js";
import { webhookQueue } from "../config/queue.js";
import { env } from "../config/env.js";

/**
 * Creates a webhook log row (single row for all attempts) and enqueues delivery.
 * Skips entirely if merchant has no webhook_url.
 */
export async function createWebhookLogAndEnqueue({ merchantId, event, payload }) {
  const merchantResult = await pool.query(
    "SELECT webhook_url FROM merchants WHERE id = $1",
    [merchantId]
  );

  if (merchantResult.rows.length === 0) return { skipped: true };
  const { webhook_url: webhookUrl } = merchantResult.rows[0];
  if (!webhookUrl) return { skipped: true };

  const logResult = await pool.query(
    `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts, next_retry_at)
     VALUES ($1, $2, $3, 'pending', 0, NOW())
     RETURNING id`,
    [merchantId, event, payload]
  );

  const logId = logResult.rows[0].id;

  // Enqueue first attempt immediately. Retries are scheduled by the worker using DB next_retry_at.
  await webhookQueue.add(
    { logId },
    {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false
    }
  );

  return { logId };
}

export async function resetWebhookLogForRetry({ webhookId, merchantId }) {
  const logResult = await pool.query(
    "SELECT id FROM webhook_logs WHERE id = $1 AND merchant_id = $2",
    [webhookId, merchantId]
  );

  if (logResult.rows.length === 0) return null;

  await pool.query(
    "UPDATE webhook_logs SET status = 'pending', attempts = 0, next_retry_at = NOW(), last_attempt_at = NULL, response_code = NULL, response_body = NULL WHERE id = $1",
    [webhookId]
  );

  await webhookQueue.add(
    { logId: webhookId },
    {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false
    }
  );

  return { id: webhookId, status: "pending", message: "Webhook retry scheduled" };
}


