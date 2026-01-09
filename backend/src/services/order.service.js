import { pool } from "../config/db.js";
import { generateOrderId } from "../utils/id.generator.js";

export async function createOrder({ merchant, amount, currency, receipt, notes }) {
  if (!Number.isInteger(amount) || amount < 100) {
    return {
      error: {
        code: "BAD_REQUEST_ERROR",
        description: "amount must be at least 100"
      }
    };
  }

  const orderId = generateOrderId();

  const result = await pool.query(
    `INSERT INTO orders (
      id, merchant_id, amount, currency, receipt, notes, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, 'created'
    ) RETURNING id, merchant_id, amount, currency, receipt, notes, status, created_at`,
    [
      orderId,
      merchant.id,
      amount,
      currency || "INR",
      receipt || null,
      notes || null
    ]
  );

  return result.rows[0];
}

export async function getOrderById({ orderId, merchantId }) {
  const result = await pool.query(
    `SELECT id, merchant_id, amount, currency, receipt, notes,
            status, created_at, updated_at
     FROM orders
     WHERE id = $1 AND merchant_id = $2`,
    [orderId, merchantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
