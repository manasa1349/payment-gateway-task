# Payment Gateway with Async Processing and Webhooks

A production-ready payment gateway system implementing asynchronous job processing, webhook delivery with retry mechanisms, embeddable JavaScript SDK, and comprehensive refund management.

## Features

### 🚀 Core Capabilities
- **Async Payment Processing**: Background job processing with Redis + Bull
- **Webhook System**: HMAC-SHA256 signed event delivery with automatic retry logic (5 attempts, exponential backoff)
- **Embeddable SDK**: Cross-origin iframe-based payment widget for merchant websites
- **Refund Management**: Full and partial refund support with async processing
- **Idempotent Operations**: Prevent duplicate charges on network retries
- **Production-Ready Architecture**: Scalable, reliable system for handling real payments

### ⚙️ Technical Stack
- **Backend**: Node.js + Express.js
- **Frontend**: React + React Router
- **Database**: PostgreSQL
- **Job Queue**: Bull (Redis-based)
- **Payments**: UPI, Card payment methods
- **Deployment**: Docker Compose with multi-service architecture

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)

### 1. Start the Application

```bash
cd payment-gateway-task
docker-compose up -d
```

### Smoke test (Windows)

```bash
scripts\\smoke-test.cmd
```

### 2. Access the Services

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | http://localhost:8000 | Payment processing |
| **Dashboard** | http://localhost:3000 | Merchant control panel |
| **Checkout** | http://localhost:3001 | Payment page |

### 3. Login to Dashboard

Navigate to http://localhost:3000

**Test Credentials:**
- Email: `test@example.com`
- Password: (any password)

## API Endpoints

All authenticated endpoints require headers:
```
X-Api-Key: key_test_abc123
X-Api-Secret: secret_test_xyz789
```

### Payment Operations

#### Create Order
```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "currency": "INR", "receipt": "receipt_123"}'
```

#### Create Payment (Async, with Idempotency)
```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Idempotency-Key: unique_request_id_123" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_xyz",
    "method": "upi",
    "vpa": "user@paytm"
  }'
```

Response (status: "pending", actual processing happens async):
```json
{
  "id": "pay_...",
  "order_id": "order_xyz",
  "amount": 50000,
  "status": "pending",
  "created_at": "2024-01-15T10:31:00Z"
}
```

#### Capture Payment
```bash
curl -X POST http://localhost:8000/api/v1/payments/{payment_id}/capture \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000}'
```

#### Create Refund (Async)
```bash
curl -X POST http://localhost:8000/api/v1/payments/{payment_id}/refunds \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "reason": "Customer requested"}'
```

#### Get Refund Status
```bash
curl http://localhost:8000/api/v1/refunds/{refund_id} \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

#### List Webhook Logs
```bash
curl "http://localhost:8000/api/v1/webhooks?limit=10&offset=0" \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

#### Retry Webhook
```bash
curl -X POST http://localhost:8000/api/v1/webhooks/{webhook_id}/retry \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

#### Job Queue Status
```bash
curl http://localhost:8000/api/v1/test/jobs/status

# Response
{
  "pending": 5,
  "processing": 2,
  "completed": 100,
  "failed": 0,
  "worker_status": "running"
}
```

## Async Job Processing

### Job Types

1. **PaymentWorker**: Processes payments asynchronously
   - 5-10 second simulated delay
   - 90% success for UPI, 95% for cards
   - Updates payment status
   - Enqueues webhook delivery

2. **RefundWorker**: Processes refunds asynchronously
   - 3-5 second simulated delay
   - Updates refund status
   - Enqueues webhook delivery

3. **WebhookWorker**: Delivers webhooks to merchant endpoints
   - HMAC-SHA256 signature
   - Automatic retry (5 attempts)
   - Exponential backoff scheduling

### Test Mode

Set environment variables for fast testing:

```yaml
TEST_MODE: "true"
TEST_PAYMENT_SUCCESS: "true"
TEST_PROCESSING_DELAY: "1000"  # 1 second instead of 5-10
WEBHOOK_RETRY_INTERVALS_TEST: "true"  # Short intervals: 0s, 5s, 10s, 15s, 20s
```

## Webhook Integration

### Webhook Payload Format

```json
{
  "event": "payment.success",
  "timestamp": 1705315870,
  "data": {
    "payment": {
      "id": "pay_...",
      "order_id": "order_...",
      "amount": 50000,
      "currency": "INR",
      "status": "success",
      "created_at": "2024-01-15T10:31:00Z"
    }
  }
}
```

### Events

- `payment.created` - Payment record created
- `payment.pending` - Payment awaiting processing
- `payment.success` - Payment succeeded
- `payment.failed` - Payment failed
- `refund.created` - Refund initiated
- `refund.processed` - Refund completed

### Verify Webhook Signature

```javascript
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', 'whsec_test_abc123')
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  console.log('✅ Webhook verified');
  res.status(200).send('OK');
});
```

## Embeddable SDK

### Integration Example

```html
<script src="http://localhost:3001/checkout.js"></script>

<button id="pay-button">Pay ₹500</button>

<script>
document.getElementById('pay-button').addEventListener('click', () => {
  const checkout = new PaymentGateway({
    key: 'key_test_abc123',
    orderId: 'order_xyz',
    onSuccess: (response) => {
      console.log('Payment successful:', response.paymentId);
    },
    onFailure: (error) => {
      console.log('Payment failed:', error);
    },
    onClose: () => {
      console.log('Modal closed');
    }
  });
  
  checkout.open();
});
</script>
```

## Dashboard Features

- **Dashboard**: Overview, API credentials, quick statistics
- **Transactions**: Payment and refund history
- **Webhooks**: Configure endpoints, view delivery logs, manual retry
- **API Docs**: Integration guide with code examples

## Database Schema

### Key Tables

```sql
merchants (id, email, api_key, api_secret, webhook_url, webhook_secret)
orders (id, merchant_id, amount, currency, status)
payments (id, order_id, merchant_id, amount, method, status, captured)
refunds (id, payment_id, merchant_id, amount, status, processed_at)
webhook_logs (id, merchant_id, event, payload, status, attempts, next_retry_at)
idempotency_keys (key, merchant_id, response, expires_at)
```

## Docker Services

- **postgres:15-alpine** - Database
- **redis:7-alpine** - Job queue
- **api** - Payment processing backend
- **worker** - Background job processor
- **dashboard** - Merchant control panel (React)
- **checkout** - Payment checkout (React)

## File Structure

```
backend/
  ├── src/
  │   ├── app.js
  │   ├── worker.js              # Job processor entry
  │   ├── config/
  │   │   ├── db.js
  │   │   ├── queue.js          # Bull queue setup
  │   │   └── env.js
  │   ├── db/
  │   │   └── schema.sql        # Tables with webhook_logs, etc.
  │   ├── routes/
  │   │   └── payments.js       # All payment + webhook endpoints
  │   ├── services/
  │   │   └── payment.service.js # Async logic
  │   └── utils/
  │       └── webhook.js         # HMAC, retry logic
  ├── Dockerfile
  ├── Dockerfile.worker         # Separate worker image
  └── package.json

frontend/
  └── src/pages/
      ├── Dashboard.jsx
      ├── Transactions.jsx
      ├── Webhooks.jsx           # NEW
      └── APIDocumentation.jsx   # NEW

checkout-page/
  └── src/
      ├── sdk/
      │   └── PaymentGateway.js  # Embeddable widget
      └── pages/
          └── Checkout.jsx       # iframe-compatible form
```

## Environment Configuration

```yaml
# API & Worker Services
DATABASE_URL: postgresql://gateway_user:gateway_pass@postgres:5432/payment_gateway
REDIS_URL: redis://redis:6379
TEST_MODE: "false"
TEST_PAYMENT_SUCCESS: "true"
TEST_PROCESSING_DELAY: "1000"
WEBHOOK_RETRY_INTERVALS_TEST: "true"
```

## Testing Workflow

1. **Create order**: Get order_id
2. **Create payment**: Returns pending status immediately
3. **Check queue**: Verify jobs are queued
4. **Wait**: Let worker process (1-10 seconds depending on TEST_MODE)
5. **Check status**: Payment should be success/failed
6. **Verify webhook**: Check logs in dashboard
7. **Test refund**: Create refund if payment successful
8. **Check refund**: Verify refund processed after delay

## Common Issues

**Worker not processing jobs?**
- Verify Redis is running: `docker-compose ps redis`
- Check worker logs: `docker-compose logs worker`

**Webhooks not delivering?**
- Configure webhook URL in dashboard
- Verify merchant webhook_secret is set
- Check webhook_logs table in database

**Idempotency not working?**
- Ensure Idempotency-Key header is provided
- Key is scoped to merchant + key combination
- Response cached for 24 hours

**SDK not loading?**
- Verify checkout-page is running: http://localhost:3001/checkout.js
- Check browser console for CORS errors
- Ensure SDK src points to correct URL

## Performance Highlights

-  Async processing prevents API blocking
-  Bull queue efficiently handles thousands of jobs
-  Database indexes optimize webhook queries
-  Exponential backoff prevents server overload
-  SDK bundles into single 10KB file

## Security Features

-  API key authentication
-  HMAC-SHA256 webhook signatures
-  Idempotent payment operations
-  SQL injection prevention
-  CORS support for SDK

## References

- **submission.yml** - Automated evaluation config
- **TESTING_GUIDE.md** - Comprehensive test scenarios
- Dashboard contains API documentation with live examples

## License

Educational project for demonstration purposes.

---

**Developed using Node.js, React, PostgreSQL, and Docker**
