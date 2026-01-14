import express from "express";
import { authenticateMerchant } from "../middleware/auth.js";
import { pool } from "../config/db.js";
import { resetWebhookLogForRetry, createWebhookLogAndEnqueue } from "../services/webhook.service.js";

const router = express.Router();

// GET /api/v1/webhooks?limit=10&offset=0 - List webhook logs
router.get("/", authenticateMerchant, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = parseInt(req.query.offset || "0", 10);

    const totalResult = await pool.query(
      "SELECT COUNT(*) as count FROM webhook_logs WHERE merchant_id = $1",
      [req.merchant.id]
    );

    const logsResult = await pool.query(
      `SELECT id, event, status, attempts, last_attempt_at, response_code, created_at
       FROM webhook_logs
       WHERE merchant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.merchant.id, limit, offset]
    );

    return res.status(200).json({
      data: logsResult.rows.map((row) => ({
        id: row.id,
        event: row.event,
        status: row.status,
        attempts: row.attempts,
        created_at: row.created_at.toISOString(),
        last_attempt_at: row.last_attempt_at ? row.last_attempt_at.toISOString() : null,
        response_code: row.response_code
      })),
      total: parseInt(totalResult.rows[0].count, 10),
      limit,
      offset
    });
  } catch (err) {
    console.error("List webhook logs error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to fetch webhook logs"
      }
    });
  }
});

// POST /api/v1/webhooks/{webhook_id}/retry - Manual retry
router.post("/:webhook_id/retry", authenticateMerchant, async (req, res) => {
  try {
    const { webhook_id } = req.params;

    const result = await resetWebhookLogForRetry({
      webhookId: webhook_id,
      merchantId: req.merchant.id
    });

    if (!result) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Webhook log not found"
        }
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Retry webhook error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to retry webhook"
      }
    });
  }
});

// PUT /api/v1/webhooks/config - Update webhook url (and optionally secret)
router.put("/config", authenticateMerchant, async (req, res) => {
  try {
    const { webhook_url } = req.body;
    if (webhook_url !== null && webhook_url !== undefined && typeof webhook_url !== "string") {
      return res.status(400).json({
        error: { code: "BAD_REQUEST_ERROR", description: "webhook_url must be a string or null" }
      });
    }

    const result = await pool.query(
      "UPDATE merchants SET webhook_url = $1, updated_at = NOW() WHERE id = $2 RETURNING webhook_url, webhook_secret",
      [webhook_url || null, req.merchant.id]
    );

    return res.status(200).json({
      webhook_url: result.rows[0].webhook_url,
      webhook_secret: result.rows[0].webhook_secret
    });
  } catch (err) {
    console.error("Save webhook config error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", description: "Failed to save webhook configuration" }
    });
  }
});

// POST /api/v1/webhooks/regenerate-secret - Regenerate webhook secret
router.post("/regenerate-secret", authenticateMerchant, async (req, res) => {
  try {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let random = "";
    for (let i = 0; i < 16; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
    const webhookSecret = `whsec_${random}`;

    const result = await pool.query(
      "UPDATE merchants SET webhook_secret = $1, updated_at = NOW() WHERE id = $2 RETURNING webhook_secret",
      [webhookSecret, req.merchant.id]
    );

    return res.status(200).json({ webhook_secret: result.rows[0].webhook_secret });
  } catch (err) {
    console.error("Regenerate secret error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", description: "Failed to regenerate webhook secret" }
    });
  }
});

// POST /api/v1/webhooks/test - Send a test webhook (queued, signed, logged)
router.post("/test", authenticateMerchant, async (req, res) => {
  try {
    const payload = {
      event: "webhook.test",
      timestamp: Math.floor(Date.now() / 1000),
      data: { message: "This is a test webhook" }
    };

    const result = await createWebhookLogAndEnqueue({
      merchantId: req.merchant.id,
      event: "webhook.test",
      payload
    });

    if (result.skipped) {
      return res.status(200).json({ skipped: true, message: "Webhook URL not configured" });
    }

    return res.status(200).json({ scheduled: true, webhook_id: result.logId });
  } catch (err) {
    console.error("Test webhook error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", description: "Failed to send test webhook" }
    });
  }
});

export default router;


