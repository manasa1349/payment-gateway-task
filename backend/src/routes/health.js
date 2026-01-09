import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
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

export default router;