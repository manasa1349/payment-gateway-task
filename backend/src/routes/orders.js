import express from "express";
import { authenticateMerchant } from "../middleware/auth.js";
import { createOrder } from "../services/order.service.js";
import { pool } from "../config/db.js";

const router = express.Router();

router.post("/", authenticateMerchant, async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    const result = await createOrder({
      merchant: req.merchant,
      amount,
      currency,
      receipt,
      notes
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Format timestamps to ISO strings
    const formattedResult = {
      ...result,
      created_at: result.created_at ? new Date(result.created_at).toISOString() : undefined
    };

    return res.status(201).json(formattedResult);
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to create order"
      }
    });
  }
});

import { getOrderById } from "../services/order.service.js";

router.get("/:order_id", authenticateMerchant, async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await getOrderById({
      orderId: order_id,
      merchantId: req.merchant.id
    });

    if (!order) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Order not found"
        }
      });
    }

    // Format timestamps to ISO strings
    const formattedOrder = {
      ...order,
      created_at: order.created_at ? new Date(order.created_at).toISOString() : undefined,
      updated_at: order.updated_at ? new Date(order.updated_at).toISOString() : undefined
    };

    return res.status(200).json(formattedOrder);
  } catch (err) {
    console.error("Get order error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to fetch order"
      }
    });
  }
});

router.get("/:order_id/public", async (req, res) => {
  try {
    const { order_id } = req.params;

    const result = await pool.query(
      `SELECT id, amount, currency, status
       FROM orders
       WHERE id = $1`,
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Order not found"
        }
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Public order fetch error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to fetch order"
      }
    });
  }
});

export default router;