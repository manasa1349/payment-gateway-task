import express from "express";
import { authenticateMerchant } from "../middleware/auth.js";
import { pool } from "../config/db.js";
import { createPayment } from "../services/payment.service.js";
import { getPaymentById } from "../services/payment.service.js";

const router = express.Router();

router.post("/", authenticateMerchant, async (req, res) => {
  try {
    const { order_id } = req.body;

    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id=$1 AND merchant_id=$2`,
      [order_id, req.merchant.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Order not found"
        }
      });
    }

    const result = await createPayment({
      merchant: req.merchant,
      order: orderResult.rows[0],
      body: req.body
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error("Create payment error:", err);
    return res.status(500).json({
      error: {
        code: "PAYMENT_FAILED",
        description: "Payment processing failed"
      }
    });
  }
});


// List all payments for merchant
router.get("/list", authenticateMerchant, async (req, res) => {
  try {
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
      WHERE merchant_id = $1
      ORDER BY created_at DESC`,
      [req.merchant.id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("List payments error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to fetch payments"
      }
    });
  }
});

router.get("/:payment_id", authenticateMerchant, async (req, res) => {
  try {
    const { payment_id } = req.params;

    const payment = await getPaymentById({
      paymentId: payment_id,
      merchantId: req.merchant.id
    });

    if (!payment) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Payment not found"
        }
      });
    }

    // Format timestamps to ISO strings
    const formattedPayment = {
      ...payment,
      created_at: payment.created_at ? new Date(payment.created_at).toISOString() : undefined,
      updated_at: payment.updated_at ? new Date(payment.updated_at).toISOString() : undefined
    };

    return res.status(200).json(formattedPayment);
  } catch (err) {
    console.error("Get payment error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to fetch payment"
      }
    });
  }
});


router.post("/public", async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST_ERROR",
          description: "order_id is required"
        }
      });
    }

    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Order not found"
        }
      });
    }

    const order = orderResult.rows[0];

    // Fetch merchant for this order
    const merchantResult = await pool.query(
      `SELECT * FROM merchants WHERE id = $1 AND is_active = true`,
      [order.merchant_id]
    );

    if (merchantResult.rows.length === 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST_ERROR",
          description: "Invalid merchant"
        }
      });
    }

    const result = await createPayment({
      merchant: merchantResult.rows[0],
      order,
      body: req.body
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error("Public payment error:", err);
    return res.status(500).json({
      error: {
        code: "PAYMENT_FAILED",
        description: "Payment processing failed"
      }
    });
  }
});

// PUBLIC: Get payment status (for checkout polling)
router.get("/public/:payment_id", async (req, res) => {
  try {
    const { payment_id } = req.params;

    const result = await pool.query(
      `SELECT id, order_id, status, amount, currency
       FROM payments
       WHERE id = $1`,
      [payment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Payment not found"
        }
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Public get payment error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to fetch payment"
      }
    });
  }
});

export default router;
