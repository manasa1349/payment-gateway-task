# Payment Gateway System

A full-stack payment gateway system inspired by Razorpay and Stripe, providing merchant APIs, hosted checkout pages, and administrative dashboards.

This system enables merchants to create payment orders through secure REST APIs, and allows customers to complete payments using a hosted checkout page supporting multiple payment methods (UPI and Cards).

## Features

- REST API with merchant authentication using API key and secret
- Order creation and payment workflow
- UPI and card payment processing with full validation
- Hosted checkout page with payment polling
- Merchant dashboard with live transaction statistics
- Dockerized environment for unified deployment
- PostgreSQL-backed persistence layer

---

## Technology Stack

| Component | Technology              |
| --------- | ----------------------- |
| Backend   | Node.js + Express       |
| Dashboard | React                   |
| Checkout  | React                   |
| Database  | PostgreSQL 15           |
| Container | Docker + Docker Compose |

---

## System Architecture

```
+------------------+        HTTPS/REST       +---------------------------+
| Merchant System  |  <--------------------> | Payment Gateway API       |
| (Postman/Server) |                         | (Node.js, Port 8000)      |
+------------------+                         +-------------+-------------+
                                                        | DB Queries
                                                        v
                                               +---------------------------+
                                               | PostgreSQL                |
                                               | (Port 5432)               |
                                               +---------------------------+
                                                        ^
                                                        |
                                                        |
                                                +-------+--------+
                                                | Checkout Page  |
                                                | (React, 3001)  |
                                                +----------------+
                                                        ^
                                                        |
                                                +-------+--------+
                                                | Dashboard      |
                                                | (React, 3000)  |
                                                +----------------+
```

---

## Deployment

### Requirements

- Docker and Docker Compose installed
- No services running on:
  - Port 8000 (API)
  - Port 3000 (Dashboard)
  - Port 3001 (Checkout)
  - Port 5432 (PostgreSQL)

### Startup

```
git clone <REPOSITORY_URL>
cd payment-gateway
docker-compose up -d
```

### Services

| Service   | URL                   |
| --------- | --------------------- |
| API       | http://localhost:8000 |
| Dashboard | http://localhost:3000 |
| Checkout  | http://localhost:3001 |

Wait approximately 20–30 seconds for all services to initialize.

---

## Test Merchant Credentials

The system seeds the following merchant into the database on startup:

```
Email: test@example.com
API Key: key_test_abc123
API Secret: secret_test_xyz789
```

Usage:

- Used by merchants to authenticate API requests
- Used to log into the dashboard (any password accepted)

---

## API Documentation

Base URL:

```
http://localhost:8000
```

### Authentication

Send in headers:

```
X-Api-Key: key_test_abc123
X-Api-Secret: secret_test_xyz789
```

If authentication fails, responses follow:

```
401 Unauthorized
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "description": "Invalid API credentials"
  }
}
```

---

### 1. Health Check

```
GET /health
```

Response:

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-04T10:30:00Z"
}
```

---

### 2. Create Order

```
POST /api/v1/orders
```

Request:

```json
{
  "amount": 50000,
  "currency": "INR",
  "receipt": "order_001",
  "notes": {
    "customer": "John Doe"
  }
}
```

Response 201:

```json
{
  "id": "order_xxxxxxxxxxxxxxxx",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "status": "created",
  "created_at": "2026-01-04T..."
}
```

Order ID Format:

```
order_ + 16 alphanumeric characters
```

---

### 3. Get Order

```
GET /api/v1/orders/{order_id}
```

Response 200 returns full order details.

---

### 4. Public Order Endpoint (Checkout)

```
GET /api/v1/orders/{order_id}/public
```

Returns minimal fields without auth:

```json
{
  "id": "order_xxxx",
  "amount": 50000,
  "currency": "INR",
  "status": "created"
}
```

---

### 5. Create Payment

```
POST /api/v1/payments
```

Supports methods:

- UPI
- Card

#### UPI Request Example:

```json
{
  "order_id": "order_xxxx",
  "method": "upi",
  "vpa": "user@paytm"
}
```

#### Card Request Example:

```json
{
  "order_id": "order_xxxx",
  "method": "card",
  "card": {
    "number": "4111111111111111",
    "expiry_month": "12",
    "expiry_year": "2027",
    "cvv": "123",
    "holder_name": "John Doe"
  }
}
```

Payment Status Flow:

```
processing → success
processing → failed
```

Processing delay (simulation):

```
5–10 seconds (random)
```

Success rates:

```
UPI: 90%
Card: 95%
```

Payment ID Format:

```
pay_ + 16 alphanumeric characters
```

---

### 6. Get Payment

```
GET /api/v1/payments/{payment_id}
```

Response:

Includes method-specific fields and timestamps.

---

### 7. List Payments

```
GET /api/v1/payments/list
```

Returns array for dashboard.

---

### Error Codes

The API standardizes errors using:

| Code                 |
| -------------------- |
| AUTHENTICATION_ERROR |
| BAD_REQUEST_ERROR    |
| INVALID_VPA          |
| INVALID_CARD         |
| EXPIRED_CARD         |
| NOT_FOUND_ERROR      |
| PAYMENT_FAILED       |

---

## Validation Logic

### VPA Format

Pattern:

```
^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$
```

### Card Validation

Includes:

- Luhn algorithm
- Expiry date validation
- Network detection

Networks supported:

| Prefix        | Network    |
| ------------- | ---------- |
| 4             | Visa       |
| 51–55         | Mastercard |
| 34, 37        | Amex       |
| 60, 65, 81–89 | RuPay      |

Only last 4 digits stored.

CVV never stored.

---

## Deterministic Test Mode

Environment Variables:

```
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
```

Used for automated and reproducible payment outcomes.

---

## Database Schema

### merchants

- id (UUID PK)
- name
- email (unique)
- api_key (unique)
- api_secret
- webhook_url
- is_active (boolean)
- timestamps

### orders

- id (order\_ + 16 chars PK)
- merchant_id (UUID FK)
- amount (integer)
- currency
- receipt
- notes (JSONB)
- status
- timestamps

### payments

- id (pay\_ + 16 chars PK)
- order_id (FK)
- merchant_id (FK)
- amount
- currency
- method
- status
- vpa
- card_network
- card_last4
- error_code
- error_description
- timestamps

Indexes:

- idx_orders_merchant_id
- idx_payments_order_id
- idx_payments_status

---

## Dashboard (Port 3000)

Pages:

### Login (/login)

Data attributes:

```
data-test-id="login-form"
data-test-id="email-input"
data-test-id="password-input"
data-test-id="login-button"
```

### Dashboard (/dashboard)

Displays:

- API key
- API secret
- Total transactions
- Total amount
- Success rate

### Transactions (/dashboard/transactions)

Table columns:

- payment_id
- order_id
- amount
- method
- status
- created_at

---

## Checkout Page (Port 3001)

URL Format:

```
/checkout?order_id=xxxxx
```

Behaviors:

- Fetch order details
- Select method (UPI or Card)
- Submit payment
- Poll for status
- Display success or failure

---

## Testing

Using curl:

```
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/test/merchant
```

Additional test sequences available in repository under `/docs/tests.md`.

---

## Local Development (Without Docker)

Run PostgreSQL and set `.env`.

Then:

```
cd backend && npm install && npm start
cd frontend && npm install && npm run dev
cd checkout-page && npm install && npm run dev
```

---

## License

This project is intended for educational and demonstration use.
