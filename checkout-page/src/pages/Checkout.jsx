import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState(null);
  const [vpa, setVpa] = useState("");
  const [card, setCard] = useState({
    number: "",
    expiry: "",
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

  // Poll payment status
  useEffect(() => {
    if (!paymentId) return;

    setProcessing(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/payments/public/${paymentId}`);
        const data = await res.json();

        if (data.status === "success") {
          clearInterval(interval);
          window.location.href = `/success?payment_id=${paymentId}`;
        } else if (data.status === "failed") {
          clearInterval(interval);
          window.location.href = `/failure?payment_id=${paymentId}`;
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [paymentId]);

  // Create payment
  async function handlePayment(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProcessing(false);

    let payload;
    if (method === "upi") {
      payload = {
        order_id: orderId,
        method: "upi",
        vpa: vpa.trim()
      };
    } else {
      // Parse MM/YY format
      const [expiryMonth, expiryYear] = card.expiry.split("/");
      if (!expiryMonth || !expiryYear) {
        setError("Invalid expiry format. Use MM/YY");
        setLoading(false);
        return;
      }

      payload = {
        order_id: orderId,
        method: "card",
        card: {
          number: card.number.replace(/\s/g, ""),
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv: card.cvv,
          holder_name: card.name
        }
      };
    }

    try {
      const res = await fetch(`${API_BASE}/payments/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.description || "Payment failed");
        setLoading(false);
        return;
      }

      setPaymentId(data.id);
      setLoading(false);
      setProcessing(true);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (!orderId) {
    return (
      <div data-test-id="checkout-container" style={{ padding: "40px", textAlign: "center" }}>
        <h2>Invalid Order</h2>
        <p>Order ID is required</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div data-test-id="checkout-container" style={{ padding: "40px", textAlign: "center" }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div data-test-id="checkout-container" style={{ padding: "40px", textAlign: "center" }}>
        <h2>Loading order...</h2>
      </div>
    );
  }

  const amountInRupees = (order.amount / 100).toFixed(2);

  return (
    <div data-test-id="checkout-container" style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      {/* Order Summary */}
      <div data-test-id="order-summary" style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        <h2 style={{ marginTop: 0 }}>Complete Payment</h2>
        <div style={{ marginBottom: "10px" }}>
          <span style={{ fontWeight: "bold" }}>Amount: </span>
          <span data-test-id="order-amount">₹{amountInRupees}</span>
        </div>
        <div>
          <span style={{ fontWeight: "bold" }}>Order ID: </span>
          <span data-test-id="order-id">{order.id}</span>
        </div>
      </div>

      {/* Payment Method Selection */}
      {!method && !processing && (
        <div data-test-id="payment-methods" style={{ marginBottom: "20px" }}>
          <button
            data-test-id="method-upi"
            data-method="upi"
            onClick={() => setMethod("upi")}
            style={{
              padding: "12px 24px",
              marginRight: "10px",
              fontSize: "16px",
              cursor: "pointer",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px"
            }}
          >
            UPI
          </button>
          <button
            data-test-id="method-card"
            data-method="card"
            onClick={() => setMethod("card")}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              cursor: "pointer",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px"
            }}
          >
            Card
          </button>
        </div>
      )}

      {/* UPI Payment Form */}
      {method === "upi" && !processing && (
        <form
          data-test-id="upi-form"
          onSubmit={handlePayment}
          style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" }}
        >
          <div style={{ marginBottom: "15px" }}>
            <input
              data-test-id="vpa-input"
              placeholder="username@bank"
              type="text"
              value={vpa}
              onChange={(e) => setVpa(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <button
            data-test-id="pay-button"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              background: loading ? "#94a3b8" : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Processing..." : `Pay ₹${amountInRupees}`}
          </button>
        </form>
      )}

      {/* Card Payment Form */}
      {method === "card" && !processing && (
        <form
          data-test-id="card-form"
          onSubmit={handlePayment}
          style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" }}
        >
          <div style={{ marginBottom: "15px" }}>
            <input
              data-test-id="card-number-input"
              placeholder="Card Number"
              type="text"
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
              required
              maxLength={19}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <input
              data-test-id="expiry-input"
              placeholder="MM/YY"
              type="text"
              value={card.expiry}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value.length >= 2) {
                  value = value.slice(0, 2) + "/" + value.slice(2, 4);
                }
                setCard({ ...card, expiry: value });
              }}
              required
              maxLength={5}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <input
              data-test-id="cvv-input"
              placeholder="CVV"
              type="text"
              value={card.cvv}
              onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              required
              maxLength={4}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <input
              data-test-id="cardholder-name-input"
              placeholder="Name on Card"
              type="text"
              value={card.name}
              onChange={(e) => setCard({ ...card, name: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <button
            data-test-id="pay-button"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              background: loading ? "#94a3b8" : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Processing..." : `Pay ₹${amountInRupees}`}
          </button>
        </form>
      )}

      {/* Processing State */}
      {processing && (
        <div
          data-test-id="processing-state"
          style={{
            textAlign: "center",
            padding: "40px",
            background: "#f0f9ff",
            borderRadius: "8px",
            border: "1px solid #bae6fd"
          }}
        >
          <div
            className="spinner"
            style={{
              border: "4px solid #f3f4f6",
              borderTop: "4px solid #2563eb",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <span data-test-id="processing-message">Processing payment...</span>
        </div>
      )}

      {/* Error State */}
      {error && !processing && (
        <div
          data-test-id="error-state"
          style={{
            background: "#fef2f2",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            marginTop: "20px"
          }}
        >
          <h2 style={{ color: "#dc2626", marginTop: 0 }}>Payment Failed</h2>
          <span data-test-id="error-message" style={{ color: "#991b1b" }}>
            {error}
          </span>
          <br />
          <button
            data-test-id="retry-button"
            onClick={() => {
              setError(null);
              setMethod(null);
              setPaymentId(null);
            }}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
