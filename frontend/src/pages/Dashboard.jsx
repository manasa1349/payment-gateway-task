import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1";

export default function Dashboard() {
  const [merchant, setMerchant] = useState(null);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem("merchantEmail");
    if (!email) {
      navigate("/login");
      return;
    }

    const apiKey = localStorage.getItem("merchantApiKey");
    const apiSecret = localStorage.getItem("merchantApiSecret");

    // Fetch merchant details
    fetch(`${API_BASE}/test/merchant`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setMerchant({
            id: data.id,
            email: data.email,
            apiKey: apiKey,
            apiSecret: apiSecret
          });
        }
      })
      .catch((err) => console.error("Failed to fetch merchant:", err));

    // Fetch payment statistics
    fetch(`${API_BASE}/payments/list`, {
      headers: {
        "X-Api-Key": apiKey,
        "X-Api-Secret": apiSecret
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const payments = data;
          const total = payments.length;
          const successful = payments.filter((p) => p.status === "success").length;
          const totalAmount = payments
            .filter((p) => p.status === "success")
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

          setStats({
            totalTransactions: total,
            totalAmount: totalAmount,
            successRate: successRate
          });
        }
      })
      .catch((err) => {
        console.log("Stats endpoint not available:", err);
      });
  }, [navigate]);

  if (!merchant) {
    return <div>Loading...</div>;
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  return (
    <div
      data-test-id="dashboard"
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <nav
        style={{
          background: "white",
          padding: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "30px"
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Payment Gateway Dashboard</h1>
          <div>
            <Link
              to="/dashboard/transactions"
              style={{
                marginRight: "20px",
                color: "#2563eb",
                textDecoration: "none"
              }}
            >
              Transactions
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("merchantEmail");
                localStorage.removeItem("merchantApiKey");
                localStorage.removeItem("merchantApiSecret");
                navigate("/login");
              }}
              style={{
                padding: "8px 16px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
        {/* API Credentials */}
        <div
          data-test-id="api-credentials"
          style={{
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "30px"
          }}
        >
          <h2 style={{ marginTop: 0 }}>API Credentials</h2>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              API Key
            </label>
            <span
              data-test-id="api-key"
              style={{
                display: "block",
                padding: "10px",
                background: "#f3f4f6",
                borderRadius: "6px",
                fontFamily: "monospace"
              }}
            >
              {merchant.apiKey}
            </span>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              API Secret
            </label>
            <span
              data-test-id="api-secret"
              style={{
                display: "block",
                padding: "10px",
                background: "#f3f4f6",
                borderRadius: "6px",
                fontFamily: "monospace"
              }}
            >
              {merchant.apiSecret}
            </span>
          </div>
        </div>

        {/* Statistics */}
        <div
          data-test-id="stats-container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "10px" }}>
              Total Transactions
            </div>
            <div data-test-id="total-transactions" style={{ fontSize: "32px", fontWeight: "bold" }}>
              {stats.totalTransactions}
            </div>
          </div>
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "10px" }}>
              Total Amount
            </div>
            <div data-test-id="total-amount" style={{ fontSize: "32px", fontWeight: "bold" }}>
              {formatAmount(stats.totalAmount)}
            </div>
          </div>
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "10px" }}>
              Success Rate
            </div>
            <div data-test-id="success-rate" style={{ fontSize: "32px", fontWeight: "bold" }}>
              {stats.successRate}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

