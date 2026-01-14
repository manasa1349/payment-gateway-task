# Complete Testing Guide for Payment Gateway

This guide provides step-by-step commands to test every feature and ensure everything meets evaluation criteria.

## Prerequisites

- Docker and Docker Compose installed
- curl (or use Postman/browser)
- All services should be running: `docker-compose up -d`

## Step 1: Verify Services Are Running

```bash
cd C:\payment-gateway-task
docker-compose ps
```

**Expected Output:** All 4 containers (postgres, gateway_api, gateway_dashboard, gateway_checkout) should show "Up" status.

## Step 2: Test Health Endpoint

```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-04T..."
}
```

**✅ Pass Criteria:**
- Status code: 200
- JSON response with "status": "healthy"
- "database": "connected"
- Valid ISO timestamp

## Step 3: Test Merchant Endpoint

```bash
curl http://localhost:8000/api/v1/test/merchant
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "api_key": "key_test_abc123",
  "seeded": true
}
```

**✅ Pass Criteria:**
- Status code: 200
- Exact merchant ID matches
- Exact email: test@example.com
- Exact API key: key_test_abc123
- "seeded": true

## Step 4: Test Create Order

```bash
curl -X POST http://localhost:8000/api/v1/orders -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json"  -d "{\"amount\": 50000, \"currency\": \"INR\", \"receipt\": \"test_001\", \"notes\": {\"customer\": \"John Doe\"}}"
```

**Expected Response:**
```json
{
  "id": "order_XXXXXXXXXXXXXX",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "receipt": "test_001",
  "notes": {"customer": "John Doe"},
  "status": "created",
  "created_at": "2026-01-04T..."
}
```

**✅ Pass Criteria:**
- Status code: 201
- Order ID starts with "order_" followed by 16 alphanumeric chars
- All fields present
- Valid ISO timestamp

**Save the order_id for next steps!**

## Step 5: Test Get Order

Replace `<ORDER_ID>` with the order ID from Step 4:

```bash
curl -X GET http://localhost:8000/api/v1/orders/<ORDER_ID> -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789"
```

**Expected Response:** Same as Step 4, but with `updated_at` field also.

**✅ Pass Criteria:**
- Status code: 200
- All fields match created order
- Both `created_at` and `updated_at` present

## Step 6: Test Public Order Endpoint (for Checkout)

```bash
curl http://localhost:8000/api/v1/orders/<ORDER_ID>/public
```

**Expected Response:**
```json
{
  "id": "order_XXXXXXXXXXXXXX",
  "amount": 50000,
  "currency": "INR",
  "status": "created"
}
```

**✅ Pass Criteria:**
- Status code: 200
- No authentication required
- Basic order info only

## Step 7: Test Checkout Page UI

1. Open browser: `http://localhost:3001/checkout?order_id=<ORDER_ID>`

2. **Verify Required Elements (use browser DevTools):**
   - `data-test-id="checkout-container"` - Main container
   - `data-test-id="order-summary"` - Order summary section
   - `data-test-id="order-amount"` - Shows ₹500.00
   - `data-test-id="order-id"` - Shows order ID
   - `data-test-id="payment-methods"` - Payment method buttons
   - `data-test-id="method-upi"` - UPI button
   - `data-test-id="method-card"` - Card button

3. **Click UPI button:**
   - Verify `data-test-id="upi-form"` appears
   - Verify `data-test-id="vpa-input"` is present
   - Verify `data-test-id="pay-button"` is present

4. **Click Card button:**
   - Verify `data-test-id="card-form"` appears
   - Verify all inputs:
     - `data-test-id="card-number-input"`
     - `data-test-id="expiry-input"`
     - `data-test-id="cvv-input"`
     - `data-test-id="cardholder-name-input"`
   - Verify `data-test-id="pay-button"` is present

**✅ Pass Criteria:**
- All data-test-id attributes present
- Forms display correctly
- Order details visible

## Step 8: Test UPI Payment via API

```bash
curl -X POST http://localhost:8000/api/v1/payments -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json" -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"upi\", \"vpa\": \"user@paytm\"}"
```

**Expected Response (after 5-10 seconds):**
```json
{
  "id": "pay_XXXXXXXXXXXXXX",
  "order_id": "order_XXXXXXXXXXXXXX",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "user@paytm",
  "status": "success",
  "created_at": "2026-01-04T..."
}
```

**✅ Pass Criteria:**
- Status code: 201
- Payment ID starts with "pay_" + 16 chars
- Status is "success" or "failed" (90% success rate)
- VPA field present
- Processing delay: 5-10 seconds

## Step 9: Test Card Payment via API

```bash
curl -X POST http://localhost:8000/api/v1/payments -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json" -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"card\", \"card\": {\"number\": \"4111111111111111\", \"expiry_month\": \"12\", \"expiry_year\": \"2026\", \"cvv\": \"123\", \"holder_name\": \"John Doe\"}}"
```

**Expected Response:**
```json
{
  "id": "pay_XXXXXXXXXXXXXX",
  "order_id": "order_XXXXXXXXXXXXXX",
  "amount": 50000,
  "currency": "INR",
  "method": "card",
  "card_network": "visa",
  "card_last4": "1111",
  "status": "success",
  "created_at": "2026-01-04T..."
}
```

**✅ Pass Criteria:**
- Status code: 201
- Payment ID format correct
- `card_network` detected (visa/mastercard/amex/rupay)
- `card_last4` shows last 4 digits
- Status is "success" or "failed" (95% success rate)
- Full card number NOT in response

## Step 10: Test Payment Validation (Invalid VPA)

```bash
curl -X POST http://localhost:8000/api/v1/payments -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json" -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"upi\", \"vpa\": \"invalid-vpa\"}"
```

**Expected Response:**
```json
{
  "error": {
    "code": "INVALID_VPA",
    "description": "VPA format invalid"
  }
}
```

**✅ Pass Criteria:**
- Status code: 400
- Error code: "INVALID_VPA"

## Step 11: Test Payment Validation (Invalid Card)

```bash
curl -X POST http://localhost:8000/api/v1/payments -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json" -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"card\", \"card\": {\"number\": \"1234567890123456\", \"expiry_month\": \"12\", \"expiry_year\": \"2025\", \"cvv\": \"123\", \"holder_name\": \"John Doe\"}}"
```

**Expected Response:**
```json
{
  "error": {
    "code": "INVALID_CARD",
    "description": "Card validation failed"
  }
}
```

**✅ Pass Criteria:**
- Status code: 400
- Error code: "INVALID_CARD" (Luhn algorithm validation)

## Step 12: Test Get Payment

```bash
curl -X GET http://localhost:8000/api/v1/payments/<PAYMENT_ID> -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789"
```

**Expected Response:** Complete payment details with all fields.

**✅ Pass Criteria:**
- Status code: 200
- All payment fields present
- Timestamps in ISO format

## Step 13: Test List Payments

```bash
curl -X GET http://localhost:8000/api/v1/payments/list -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789"
```

**Expected Response:**
```json
[
  {
    "id": "pay_XXXXXXXXXXXXXX",
    "order_id": "order_XXXXXXXXXXXXXX",
    "amount": 50000,
    "currency": "INR",
    "method": "upi",
    "status": "success",
    ...
  }
]
```

**✅ Pass Criteria:**
- Status code: 200
- Array of payments
- All payments belong to authenticated merchant

## Step 14: Test Dashboard Login

1. Open browser: `http://localhost:3000/login`

2. **Verify Required Elements:**
   - `data-test-id="login-form"` - Login form
   - `data-test-id="email-input"` - Email input
   - `data-test-id="password-input"` - Password input
   - `data-test-id="login-button"` - Login button

3. **Login:**
   - Email: `test@example.com`
   - Password: (any password)
   - Click login

**✅ Pass Criteria:**
- All data-test-id attributes present
- Login redirects to dashboard
- No errors

## Step 15: Test Dashboard Home

After login, verify:

1. **API Credentials Section:**
   - `data-test-id="api-credentials"` - Container
   - `data-test-id="api-key"` - Shows "key_test_abc123"
   - `data-test-id="api-secret"` - Shows "secret_test_xyz789"

2. **Statistics Section:**
   - `data-test-id="stats-container"` - Container
   - `data-test-id="total-transactions"` - Shows number
   - `data-test-id="total-amount"` - Shows formatted amount
   - `data-test-id="success-rate"` - Shows percentage

**✅ Pass Criteria:**
- All data-test-id attributes present
- API credentials visible
- Statistics calculated from real data (not hardcoded)

## Step 16: Test Transactions Page

1. Navigate to: `http://localhost:3000/dashboard/transactions`

2. **Verify Required Elements:**
   - `data-test-id="transactions-table"` - Table element
   - Table headers: Payment ID, Order ID, Amount, Method, Status, Created
   - For each row:
     - `data-test-id="transaction-row"` with `data-payment-id` attribute
     - `data-test-id="payment-id"`
     - `data-test-id="order-id"`
     - `data-test-id="amount"`
     - `data-test-id="method"`
     - `data-test-id="status"`
     - `data-test-id="created-at"`

**✅ Pass Criteria:**
- All data-test-id attributes present
- Table displays all payments
- Data formatted correctly

## Step 17: Test Checkout Payment Flow (End-to-End)

1. **Create a new order:**
```bash
curl -X POST http://localhost:8000/api/v1/orders ^
  -H "X-Api-Key: key_test_abc123" ^
  -H "X-Api-Secret: secret_test_xyz789" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\": 100000, \"currency\": \"INR\"}"
```

2. **Open checkout page:**
   - URL: `http://localhost:3001/checkout?order_id=<NEW_ORDER_ID>`

3. **Test UPI Payment:**
   - Click "UPI" button
   - Enter VPA: `user@paytm`
   - Click "Pay" button
   - Verify `data-test-id="processing-state"` appears
   - Verify `data-test-id="processing-message"` shows "Processing payment..."
   - Wait 5-10 seconds
   - Should redirect to success page

4. **Verify Success Page:**
   - URL: `http://localhost:3001/success?payment_id=<PAYMENT_ID>`
   - `data-test-id="success-state"` present
   - `data-test-id="payment-id"` shows payment ID
   - `data-test-id="success-message"` present

5. **Test Card Payment:**
   - Create another order
   - Open checkout page
   - Click "Card" button
   - Enter card details:
     - Number: `4111111111111111` (Visa test card)
     - Expiry: `12/25`
     - CVV: `123`
     - Name: `John Doe`
   - Click "Pay"
   - Verify processing state
   - Should redirect to success or failure

**✅ Pass Criteria:**
- Complete payment flow works
- All states (processing, success, failure) display correctly
- Polling works (checks status every 2 seconds)

## Step 18: Test Error Handling

### Test Authentication Error:
```bash
curl -X POST http://localhost:8000/api/v1/orders -H "X-Api-Key: invalid_key" -H "X-Api-Secret: invalid_secret" -H "Content-Type: application/json" -d "{\"amount\": 50000}"
```

**Expected:** Status 401, error code "AUTHENTICATION_ERROR"

### Test Invalid Amount:
```bash
curl -X POST http://localhost:8000/api/v1/orders -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json" -d "{\"amount\": 50}"
```

**Expected:** Status 400, error code "BAD_REQUEST_ERROR", description "amount must be at least 100"

### Test Order Not Found:
```bash
curl -X GET http://localhost:8000/api/v1/orders/order_invalid123 -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789"
```

**Expected:** Status 404, error code "NOT_FOUND_ERROR"

## Step 19: Test Card Network Detection

Test different card numbers:

```bash
# Visa
curl -X POST http://localhost:8000/api/v1/payments -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json" -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"card\", \"card\": {\"number\": \"4111111111111111\", \"expiry_month\": \"12\", \"expiry_year\": \"2027\", \"cvv\": \"123\", \"holder_name\": \"John\"}}"

# Mastercard (51-55)
curl ... -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"card\", \"card\": {\"number\": \"5555555555554444\", ...}}"

# Amex (34 or 37)
curl ... -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"card\", \"card\": {\"number\": \"378282246310005\", ...}}"
```

**✅ Pass Criteria:**
- Visa: `card_network: "visa"`
- Mastercard: `card_network: "mastercard"`
- Amex: `card_network: "amex"`
- RuPay: `card_network: "rupay"` (starts with 60, 65, or 81-89)

## Step 20: Verify Database Schema

Connect to database and verify:

```bash
docker exec -it pg_gateway psql -U gateway_user -d payment_gateway
```

Then run:
```sql
-- Check merchants table
SELECT * FROM merchants;

-- Check orders table structure
\d orders

-- Check payments table structure
\d payments

-- Verify indexes
\di
```

**✅ Pass Criteria:**
- Test merchant exists with exact credentials
- All tables have correct columns
- Indexes exist: idx_orders_merchant_id, idx_payments_order_id, idx_payments_status

## Step 21: Test Expiry Validation

```bash
# Expired card (past date)
curl -X POST http://localhost:8000/api/v1/payments -H "X-Api-Key: key_test_abc123" -H "X-Api-Secret: secret_test_xyz789" -H "Content-Type: application/json" -d "{\"order_id\": \"<ORDER_ID>\", \"method\": \"card\", \"card\": {\"number\": \"4111111111111111\", \"expiry_month\": \"01\", \"expiry_year\": \"2020\", \"cvv\": \"123\", \"holder_name\": \"John\"}}"
```

**Expected:** Status 400, error code "EXPIRED_CARD"

## Step 22: Final Checklist

- [ ] All containers running
- [ ] Health endpoint works
- [ ] Test merchant seeded correctly
- [ ] Can create orders
- [ ] Can create payments (UPI and Card)
- [ ] Payment validation works (VPA, Luhn, expiry)
- [ ] Card network detection works
- [ ] Checkout page has all data-test-id attributes
- [ ] Dashboard login works
- [ ] Dashboard has all data-test-id attributes
- [ ] Transactions page has all data-test-id attributes
- [ ] Error handling works (401, 400, 404)
- [ ] Public endpoints work (no auth required)
- [ ] Payment polling works
- [ ] Success/failure pages work
- [ ] Database schema correct
- [ ] All timestamps in ISO format
- [ ] Order IDs format: order_ + 16 chars
- [ ] Payment IDs format: pay_ + 16 chars

## Troubleshooting

### If health endpoint fails:
```bash
docker-compose logs api
# Check for database connection errors
```

### If checkout page doesn't load:
```bash
docker-compose logs checkout
# Check for build errors
```

### If dashboard doesn't load:
```bash
docker-compose logs dashboard
# Check for build errors
```

### Rebuild containers:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Success Criteria

Your implementation passes evaluation if:
1. ✅ All services start with `docker-compose up -d`
2. ✅ Health endpoint returns correct JSON
3. ✅ Test merchant auto-seeded
4. ✅ All API endpoints work with correct responses
5. ✅ All data-test-id attributes present in frontend
6. ✅ Payment validation works correctly
7. ✅ Checkout flow works end-to-end
8. ✅ Dashboard displays real data (not hardcoded)
9. ✅ Error handling returns correct error codes
10. ✅ Database schema matches specification

---

## Deliverable 2 – Async Jobs, Webhooks, Refunds, SDK

The sections above cover the **core payment gateway** (Deliverable 1).  
This section adds tests specific to **Deliverable 2**: async processing, webhooks with retries, refunds, idempotency, job queues, and the embeddable SDK.

> All commands assume:
> - API: `http://localhost:8000`
> - Dashboard: `http://localhost:3000`
> - Checkout/SDK: `http://localhost:3001`
> - Test merchant: `key_test_abc123` / `secret_test_xyz789`

### D2-Step 1: Verify Job Queue Status Endpoint

```bash
curl -s http://localhost:8000/api/v1/test/jobs/status
```

**Expected:**

```json
{
  "pending": 0,
  "processing": 0,
  "completed": 0,
  "failed": 0,
  "worker_status": "running"
}
```

If `worker_status` is not `"running"`, check worker logs:

```bash
docker-compose logs worker
```

### D2-Step 2: Async Payment Creation + Idempotency

1. **Create order** (same as before) and capture `<ORDER_ID>`.

2. **Create payment with Idempotency-Key** (note status is `pending` immediately – processing is async):

```bash
curl -s -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Idempotency-Key: idem_demo_1" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"<ORDER_ID>\",
    \"method\": \"upi\",
    \"vpa\": \"user@paytm\"
  }"
```

**Expected (example):**

```json
{
  "id": "pay_XXXXXXXXXXXXXX",
  "order_id": "<ORDER_ID>",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "status": "pending",
  "created_at": "2026-01-14T..."
}
```

3. **Repeat same request with same Idempotency-Key**:

```bash
curl -s -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Idempotency-Key: idem_demo_1" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"<ORDER_ID>\",
    \"method\": \"upi\",
    \"vpa\": \"user@paytm\"
  }"
```

**✅ Pass Criteria:**
- Response body is **bit‑for‑bit identical** (same `id`, same timestamps).
- No duplicate payment rows are created in DB.

4. **Poll payment status** until it becomes `success` or `failed`:

```bash
curl -s http://localhost:8000/api/v1/payments/<PAYMENT_ID> \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

With `TEST_MODE=true` and `TEST_PROCESSING_DELAY=1000`, this should switch from `pending` to `success`/`failed` in ~1–2 seconds.

### D2-Step 3: Capture Endpoint

If a payment is `success`, you can test capture:

```bash
curl -s -X POST http://localhost:8000/api/v1/payments/<PAYMENT_ID>/capture \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d "{\"amount\": 50000}"
```

**✅ Pass Criteria:**
- Status code `200`.
- Response includes `"captured": true`.

If payment is not in `success` state, expect:

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Payment not in capturable state"
  }
}
```

### D2-Step 4: Refunds (Full + Partial)

1. Ensure you have a **successful payment** (`status: "success"`).
2. **Create refund**:

```bash
curl -s -X POST http://localhost:8000/api/v1/payments/<PAYMENT_ID>/refunds \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 25000,
    \"reason\": \"Customer requested partial refund\"
  }"
```

**Expected (immediately, status pending):**

```json
{
  "id": "rfnd_XXXXXXXXXXXXXX",
  "payment_id": "<PAYMENT_ID>",
  "amount": 25000,
  "reason": "Customer requested partial refund",
  "status": "pending",
  "created_at": "2026-01-14T..."
}
```

3. **Poll refund**:

```bash
curl -s http://localhost:8000/api/v1/refunds/<REFUND_ID> \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

**✅ Pass Criteria:**
- `status` moves from `pending` → `processed` after ~3–5 seconds.
- `processed_at` is populated for processed refunds.
- Multiple refunds on same payment are allowed, but total refunded amount **never exceeds** original payment amount. Otherwise, expect:

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "Refund amount exceeds available amount"
  }
}
```

### D2-Step 5: Webhook Configuration + Logs + Retry

1. **Configure webhook URL** (e.g., pointing to a test receiver):

```bash
curl -s -X PUT http://localhost:8000/api/v1/webhooks/config \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d "{\"webhook_url\":\"http://host.docker.internal:4000/webhook\"}"
```

**Expected:**

```json
{
  "webhook_url": "http://host.docker.internal:4000/webhook",
  "webhook_secret": "whsec_test_abc123"
}
```

2. **Regenerate secret** (optional):

```bash
curl -s -X POST http://localhost:8000/api/v1/webhooks/regenerate-secret \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

3. **Send test webhook**:

```bash
curl -s -X POST http://localhost:8000/api/v1/webhooks/test \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

4. **View logs**:

```bash
curl -s "http://localhost:8000/api/v1/webhooks?limit=10&offset=0" \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

**✅ Pass Criteria:**
- Logs show events like `payment.created`, `payment.pending`, `payment.success`, `refund.created`, `refund.processed`, `webhook.test`.
- Each log has fields: `id`, `event`, `status`, `attempts`, `created_at`, `last_attempt_at`, `response_code`.

5. **Retry a failed webhook** (if any log has `status: "failed"` or you forcibly fail the receiver):

```bash
curl -s -X POST http://localhost:8000/api/v1/webhooks/<WEBHOOK_ID>/retry \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

**Expected:**

```json
{
  "id": "<WEBHOOK_ID>",
  "status": "pending",
  "message": "Webhook retry scheduled"
}
```

### D2-Step 6: Verify HMAC-SHA256 Webhook Signature

Run the **test merchant webhook receiver** locally:

```bash
cd test-merchant
npm install
node webhook-receiver.js
```

Configure webhook URL as `http://host.docker.internal:4000/webhook` (Windows/macOS) and ensure `webhook_secret` matches `WEBHOOK_SECRET` in the receiver (defaults to `whsec_test_abc123`).

Trigger payments/refunds and watch the receiver logs:

- `✅ Webhook verified: payment.created`
- `✅ Webhook verified: payment.pending`
- `✅ Webhook verified: payment.success`
- `✅ Webhook verified: refund.processed`

**✅ Pass Criteria:**
- Receiver prints `✅ Webhook verified: <event>` and **never** logs “Invalid signature”.

### D2-Step 7: Webhook Retry Intervals (Test Mode)

Ensure in `docker-compose.yml` (already configured):

- `WEBHOOK_RETRY_INTERVALS_TEST: "true"` for API + worker.

Modify the test receiver to **fail first N requests** (already supported in `test-merchant/webhook-receiver.js` via `FAIL_FIRST_N` env var), e.g.:

```bash
set FAIL_FIRST_N=2
node webhook-receiver.js
```

Trigger a payment and inspect `webhook_logs`:

```sql
SELECT event, status, attempts, last_attempt_at, next_retry_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 5;
```

**✅ Pass Criteria:**
- Attempts increment up to 5.
- `next_retry_at` is spaced roughly at: 0s, 5s, 10s, 15s, 20s for a given log while it is still pending.
- After 5 failed attempts, `status` becomes `failed` and no further retries are scheduled.

### D2-Step 8: Embeddable SDK / Modal

1. **Ensure checkout service is running** and SDK is served:

```bash
curl -s -o NUL -w "%{http_code}" http://localhost:3001/checkout.js
```

Expect `200`.

2. **Simple HTML page** using the SDK:

```html
<script src="http://localhost:3001/checkout.js"></script>
<button id="pay-button">Pay Now</button>
<script>
  document.getElementById('pay-button').addEventListener('click', function () {
    const checkout = new PaymentGateway({
      key: 'key_test_abc123',
      orderId: '<ORDER_ID>',
      onSuccess: function (response) {
        console.log('Payment successful:', response.paymentId);
      },
      onFailure: function (error) {
        console.log('Payment failed:', error);
      },
      onClose: function () {
        console.log('Modal closed');
      }
    });
    checkout.open();
  });
</script>
```

3. **Verify DOM structure in browser DevTools** when modal is open:

- `div#payment-gateway-modal[data-test-id="payment-modal"]`
  - `.modal-overlay`
    - `.modal-content`
      - `iframe[data-test-id="payment-iframe"]`
      - `button[data-test-id="close-modal-button"]`

4. **Verify postMessage flow**:
- On successful payment in the iframe, parent page’s `onSuccess` is called.
- On failure, `onFailure` is called.
- When user clicks close button, `onClose` is called and modal is removed from DOM.

**✅ D2 Final Checklist:**
- [ ] `/api/v1/test/jobs/status` returns queue stats.
- [ ] Payments are created with `status: "pending"` and move to `success`/`failed` via worker.
- [ ] Idempotency returns identical responses for the same key (within 24h).
- [ ] Capture endpoint works only for `success` payments.
- [ ] Refunds support full + partial logic with async processing and `processed_at`.
- [ ] Webhook URL + secret configurable via API / dashboard; secret used for HMAC-SHA256.
- [ ] Webhook logs table records events, attempts, last/next retry timestamps.
- [ ] Webhook retries follow correct interval schedule (production + test mode).
- [ ] Manual retry endpoint resets attempts and schedules a new job.
- [ ] SDK `checkout.js` loads, creates the correct modal DOM, and communicates via `postMessage`.