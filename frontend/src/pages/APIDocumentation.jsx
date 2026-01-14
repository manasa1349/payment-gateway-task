export default function APIDocumentation() {
  return (
    <div style={styles.container} data-test-id="api-docs">
      <h2 style={styles.title}>Integration Guide</h2>

      <section style={styles.section} data-test-id="section-create-order">
        <h3 style={styles.sectionTitle}>1. Create Order</h3>
        <p style={styles.description}>Create an order before accepting payment from your customer.</p>
        <pre style={styles.codeBlock} data-test-id="code-snippet-create-order"><code>{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'`}</code></pre>
      </section>

      <section style={styles.section} data-test-id="section-sdk-integration">
        <h3 style={styles.sectionTitle}>2. SDK Integration</h3>
        <p style={styles.description}>Embed the payment gateway SDK on your website to accept payments via a modal.</p>
        <pre style={styles.codeBlock} data-test-id="code-snippet-sdk"><code>{`<script src="http://localhost:3001/checkout.js"><\/script>
<script>
const checkout = new PaymentGateway({
  key: 'key_test_abc123',
  orderId: 'order_xyz',
  onSuccess: (response) => {
    console.log('Payment ID:', response.paymentId);
    // Handle success
  },
  onFailure: (error) => {
    console.error('Payment failed:', error);
    // Handle failure
  },
  onClose: () => {
    console.log('Modal closed');
  }
});

// Open payment modal on button click
document.getElementById('pay-button').addEventListener('click', () => {
  checkout.open();
});
<\/script>

<button id="pay-button">Pay Now</button>`}</code></pre>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>3. Create Payment</h3>
        <p style={styles.description}>Create a payment after customer submits the checkout form.</p>
        <pre style={styles.codeBlock}><code>{`curl -X POST http://localhost:8000/api/v1/payments \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Idempotency-Key: unique_request_id_123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "order_NXhj67fGH2jk9mPq",
    "method": "upi",
    "vpa": "user@paytm"
  }'`}</code></pre>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>4. Capture Payment</h3>
        <p style={styles.description}>Capture a payment to settle funds in your account.</p>
        <pre style={styles.codeBlock}><code>{`curl -X POST http://localhost:8000/api/v1/payments/{payment_id}/capture \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000
  }'`}</code></pre>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>5. Initiate Refund</h3>
        <p style={styles.description}>Refund a payment to the customer's original payment method.</p>
        <pre style={styles.codeBlock}><code>{`curl -X POST http://localhost:8000/api/v1/payments/{payment_id}/refunds \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "reason": "Customer requested refund"
  }'`}</code></pre>
      </section>

      <section style={styles.section} data-test-id="section-webhook-verification">
        <h3 style={styles.sectionTitle}>6. Verify Webhook Signature</h3>
        <p style={styles.description}>Verify webhook signatures to ensure authenticity of webhook events.</p>
        <pre style={styles.codeBlock} data-test-id="code-snippet-webhook"><code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}

// Use in your webhook endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  if (!verifyWebhook(payload, signature, 'whsec_test_abc123')) {
    return res.status(401).send('Invalid signature');
  }
  
  console.log('✅ Webhook verified:', payload.event);
  res.status(200).send('OK');
});`}</code></pre>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>7. Get Job Queue Status</h3>
        <p style={styles.description}>Check the status of background job processing.</p>
        <pre style={styles.codeBlock}><code>{`curl http://localhost:8000/api/v1/test/jobs/status

Response:
{
  "pending": 5,
  "processing": 2,
  "completed": 100,
  "failed": 0,
  "worker_status": "running"
}`}</code></pre>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>API Error Codes</h3>
        <div style={styles.errorTable}>
          <div style={styles.errorRow}>
            <div style={styles.errorCode}>BAD_REQUEST_ERROR</div>
            <div>Invalid request parameters</div>
          </div>
          <div style={styles.errorRow}>
            <div style={styles.errorCode}>NOT_FOUND_ERROR</div>
            <div>Resource not found</div>
          </div>
          <div style={styles.errorRow}>
            <div style={styles.errorCode}>INVALID_VPA</div>
            <div>Invalid UPI address format</div>
          </div>
          <div style={styles.errorRow}>
            <div style={styles.errorCode}>INVALID_CARD</div>
            <div>Invalid card details or card validation failed</div>
          </div>
          <div style={styles.errorRow}>
            <div style={styles.errorCode}>PAYMENT_FAILED</div>
            <div>Payment processing failed on backend</div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Webhook Events</h3>
        <p style={styles.description}>Your webhook endpoint will receive these events:</p>
        <div style={styles.eventList}>
          <div style={styles.event}>
            <strong>payment.created</strong> - Payment record created
          </div>
          <div style={styles.event}>
            <strong>payment.pending</strong> - Payment is awaiting processing
          </div>
          <div style={styles.event}>
            <strong>payment.success</strong> - Payment succeeded
          </div>
          <div style={styles.event}>
            <strong>payment.failed</strong> - Payment failed
          </div>
          <div style={styles.event}>
            <strong>refund.created</strong> - Refund initiated
          </div>
          <div style={styles.event}>
            <strong>refund.processed</strong> - Refund completed
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    maxWidth: '1000px',
    margin: '0 auto',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
  },
  title: {
    fontSize: '32px',
    marginBottom: '40px',
    color: '#1a1a1a'
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '12px',
    color: '#333',
    borderBottom: '2px solid #667eea',
    paddingBottom: '10px'
  },
  description: {
    color: '#666',
    marginBottom: '15px',
    fontSize: '14px'
  },
  codeBlock: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: '15px',
    borderRadius: '6px',
    overflowX: 'auto',
    fontSize: '12px',
    fontFamily: '"Courier New", monospace',
    margin: '10px 0'
  },
  errorTable: {
    background: '#f9f9f9',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  errorRow: {
    display: 'flex',
    borderBottom: '1px solid #eee',
    padding: '12px'
  },
  errorCode: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#c33',
    minWidth: '180px'
  },
  eventList: {
    display: 'grid',
    gap: '10px'
  },
  event: {
    background: '#f9f9f9',
    padding: '12px',
    borderLeft: '3px solid #667eea',
    borderRadius: '4px',
    fontSize: '14px'
  }
};
