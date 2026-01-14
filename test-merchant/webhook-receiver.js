import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json({ type: ["application/json", "*/json"] }));

// Config
const PORT = process.env.PORT || 4000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "whsec_test_abc123";

// Optional: fail first N requests to test retries
let failCountRemaining = Number(process.env.FAIL_FIRST_N || 0);

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-webhook-signature"];

  // IMPORTANT: signature must be computed from exact JSON string sent.
  // Here we reconstruct with JSON.stringify(req.body) which matches the sender's approach.
  const payloadString = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payloadString)
    .digest("hex");

  if (!signature || signature !== expectedSignature) {
    console.log("❌ Invalid signature", { got: signature, expected: expectedSignature });
    return res.status(401).send("Invalid signature");
  }

  console.log("✅ Webhook verified:", req.body.event);

  if (failCountRemaining > 0) {
    failCountRemaining -= 1;
    console.log(`⏳ Intentionally failing to test retries. Remaining fails: ${failCountRemaining}`);
    return res.status(500).send("Temporary failure");
  }

  return res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Test merchant webhook running on port ${PORT}`);
  console.log(`Secret: ${WEBHOOK_SECRET}`);
  console.log(`Fail first N: ${failCountRemaining}`);
});


