import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { env } from "./env.js";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const pool = new Pool({
  connectionString: env.DATABASE_URL
});

export async function initDatabase() {
  try {
    // Test connection
    await pool.query("SELECT 1");
    console.log("Database connected");

    // Load schema.sql
    const schemaPath = path.join(__dirname, "../db/schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8");
    await pool.query(schemaSQL);
    console.log("Database schema ensured");

    // Seed test merchant
    const seedQuery = `
      INSERT INTO merchants (id, name, email, api_key, api_secret, webhook_secret)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'Test Merchant',
        $1,
        $2,
        $3,
        'whsec_test_abc123'
      )
      ON CONFLICT (email) DO NOTHING;
    `;

    await pool.query(seedQuery, [
      env.TEST_MERCHANT_EMAIL,
      env.TEST_API_KEY,
      env.TEST_API_SECRET
    ]);

    // Ensure webhook_secret exists for the test merchant even if it was seeded earlier.
    await pool.query(
      `UPDATE merchants
       SET webhook_secret = COALESCE(webhook_secret, 'whsec_test_abc123'),
           updated_at = NOW()
       WHERE email = $1`,
      [env.TEST_MERCHANT_EMAIL]
    );

    console.log("Test merchant seeded (or already exists)");
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exit(1);
  }
}