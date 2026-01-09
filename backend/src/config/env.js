import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 8000,
  DATABASE_URL: process.env.DATABASE_URL,

  TEST_MERCHANT_EMAIL: process.env.TEST_MERCHANT_EMAIL,
  TEST_API_KEY: process.env.TEST_API_KEY,
  TEST_API_SECRET: process.env.TEST_API_SECRET,

  TEST_MODE: process.env.TEST_MODE === "true",
  TEST_PAYMENT_SUCCESS: process.env.TEST_PAYMENT_SUCCESS !== "false",
  TEST_PROCESSING_DELAY: Number(process.env.TEST_PROCESSING_DELAY || 1000),

  PROCESSING_DELAY_MIN: Number(process.env.PROCESSING_DELAY_MIN || 5000),
  PROCESSING_DELAY_MAX: Number(process.env.PROCESSING_DELAY_MAX || 10000)
};