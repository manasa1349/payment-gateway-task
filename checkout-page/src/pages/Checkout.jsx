import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const embedded = searchParams.get("embedded") === "true";
  const apiKey = searchParams.get("key");

  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState(null);
  const [vpa, setVpa] = useState("");
  const [card, setCard] = useState({
    number: "",
    expiry_month: "",
    expiry_year: "",
    cvv: "",
    name: ""
  });
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Fetch order details
  useEffect(() => {
    if (!orderId) {
      setError("Order ID is required");
      return;
    }

    fetch(`${API_BASE}/orders/${orderId}/public`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error.description || "Invalid order");
        } else {
          setOrder(data);
        }
      })
      .catch(() => setError("Failed to load order"));
  }, [orderId]);

  // Poll payment status (with postMessage for iframe)
  useEffect(() => {
    if (!paymentId) return;

    setProcessing(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/payments/public/${paymentId}`);
        const data = await res.json();

        if (data.status === "success") {
          clearInterval(interval);
          setProcessing(false);

          // Send success message to parent if in iframe
          if (embedded && window.parent) {
            window.parent.postMessage({
              type: 'payment_success',
              data: {
                paymentId: data.id,
                orderId: data.order_id,
                amount: data.amount,
                currency: data.currency,
                status: data.status
              }
            }, '*');
          }
        } else if (data.status === "failed") {
          clearInterval(interval);
          setProcessing(false);

          // Send failure message to parent if in iframe
          if (embedded && window.parent) {
            window.parent.postMessage({
              type: 'payment_failed',
              data: {
                paymentId: data.id,
                orderId: data.order_id,
                error: data.error || 'Payment failed'
              }
            }, '*');
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [paymentId, embedded]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let paymentBody = {
        order_id: orderId,
        method
      };

      if (method === "upi") {
        paymentBody.vpa = vpa;
      } else if (method === "card") {
        paymentBody.card = {
          number: card.number,
          expiry_month: parseInt(card.expiry_month),
          expiry_year: parseInt(card.expiry_year),
          cvv: card.cvv,
          name: card.name
        };
      }

      const response = await fetch(`${API_BASE}/payments/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(paymentBody)
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error.description);
      } else {
        setPaymentId(data.id);
      }
    } catch (err) {
      setError("Payment creation failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div style={{ textAlign: "center", padding: "40px", fontFamily: "sans-serif" }}>
        {error ? <p style={{ color: "red" }}>{error}</p> : <p>Loading order details...</p>}
      </div>
    );
  }

  if (processing) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Processing Payment...</h2>
          <div style={styles.spinner}></div>
          <p>Please wait while we process your payment</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Secure Payment</h1>

        <div style={styles.orderSummary}>
          <div style={styles.summaryRow}>
            <span>Amount:</span>
            <strong>₹{(order.amount / 100).toFixed(2)}</strong>
          </div>
          <div style={styles.summaryRow}>
            <span>Order ID:</span>
            <span>{orderId}</span>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handlePayment}>
          <div style={styles.methodSection}>
            <h3>Payment Method</h3>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="upi"
                checked={method === "upi"}
                onChange={(e) => setMethod(e.target.value)}
              />
              <span style={styles.methodText}>UPI</span>
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="card"
                checked={method === "card"}
                onChange={(e) => setMethod(e.target.value)}
              />
              <span style={styles.methodText}>Credit/Debit Card</span>
            </label>
          </div>

          {method === "upi" && (
            <div style={styles.inputGroup}>
              <label>UPI Address</label>
              <input
                type="text"
                placeholder="user@paytm"
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          {method === "card" && (
            <>
              <div style={styles.inputGroup}>
                <label>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label>Card Number</label>
                <input
                  type="text"
                  placeholder="4111 1111 1111 1111"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\s/g, '') })}
                  maxLength="16"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.twoColumn}>
                <div style={styles.inputGroup}>
                  <label>Expiry (MM/YY)</label>
                  <input
                    type="text"
                    placeholder="MM"
                    value={card.expiry_month}
                    onChange={(e) => setCard({ ...card, expiry_month: e.target.value })}
                    maxLength="2"
                    required
                    style={styles.smallInput}
                  />
                  <input
                    type="text"
                    placeholder="YY"
                    value={card.expiry_year}
                    onChange={(e) => setCard({ ...card, expiry_year: e.target.value })}
                    maxLength="2"
                    required
                    style={styles.smallInput}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label>CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={card.cvv}
                    onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                    maxLength="3"
                    required
                    style={styles.input}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={!method || loading}
            style={{
              ...styles.button,
              opacity: (!method || loading) ? 0.6 : 1,
              cursor: (!method || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Processing..." : `Pay ₹${(order.amount / 100).toFixed(2)}`}
          </button>
        </form>

        <p style={styles.footer}>Powered by Payment Gateway</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
    padding: "20px",
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
  },
  card: {
    background: "white",
    borderRadius: "12px",
    padding: "40px",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  title: {
    color: "#1a1a1a",
    marginBottom: "30px",
    fontSize: "28px"
  },
  orderSummary: {
    background: "#f9f9f9",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0"
  },
  error: {
    background: "#fee",
    color: "#c33",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px"
  },
  methodSection: {
    marginBottom: "25px"
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    padding: "10px",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer"
  },
  methodText: {
    marginLeft: "10px",
    fontWeight: "500"
  },
  inputGroup: {
    marginBottom: "20px"
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  smallInput: {
    width: "48%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    marginRight: "4%",
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  twoColumn: {
    display: "flex"
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s"
  },
  footer: {
    textAlign: "center",
    color: "#999",
    fontSize: "12px",
    marginTop: "20px"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f0f0f0",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "20px auto"
  }
};
