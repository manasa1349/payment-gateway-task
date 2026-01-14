import express from "express";
import cors from "cors";
import { pool } from "./config/db.js";

import testRoutes from "./routes/test.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payments.js";
import refundRoutes from "./routes/refunds.js";
import webhookRoutes from "./routes/webhooks.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", async (req, res) => {
  let dbStatus = "connected";

  try {
    await pool.query("SELECT 1");
  } catch (err) {
    dbStatus = "disconnected";
  }

  return res.status(200).json({
    status: "healthy",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/api/v1/test", testRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/refunds", refundRoutes);
app.use("/api/v1/webhooks", webhookRoutes);

export default app;