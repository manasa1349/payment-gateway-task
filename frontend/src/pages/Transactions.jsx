import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem("merchantEmail");
    if (!email) {
      navigate("/login");
      return;
    }

    const apiKey = localStorage.getItem("merchantApiKey");
    const apiSecret = localStorage.getItem("merchantApiSecret");

    // Fetch all payments for the merchant
    // Since there's no list endpoint, we'll need to create one or fetch from database
    // For now, let's create a simple implementation that fetches payments
    fetchPayments(apiKey, apiSecret);
  }, [navigate]);

  const fetchPayments = async (apiKey, apiSecret) => {
    try {
      // We need to get merchant ID first
      const merchantRes = await fetch(`${API_BASE}/test/merchant`);
      const merchantData = await merchantRes.json();

      if (merchantData.id) {
        // Fetch payments from database via a custom endpoint or directly
        // Since we don't have a list endpoint, we'll create a workaround
        // For now, let's assume we can query by merchant_id
        // We'll need to add this endpoint to the backend
        const paymentsRes = await fetch(`${API_BASE}/payments/list`, {
          headers: {
            "X-Api-Key": apiKey,
            "X-Api-Secret": apiSecret
          }
        });

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setTransactions(Array.isArray(paymentsData) ? paymentsData : []);
        } else {
          // Fallback: empty array if endpoint doesn't exist
          setTransactions([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format((amount || 0) / 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "#16a34a";
      case "failed":
        return "#dc2626";
      case "processing":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div>Loading transactions...</div>
      </div>
    );
  }

  return (
    <div
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
          <h1 style={{ margin: 0 }}>Transactions</h1>
          <div>
            <Link
              to="/dashboard"
              style={{
                marginRight: "20px",
                color: "#2563eb",
                textDecoration: "none"
              }}
            >
              Dashboard
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
        <div
          style={{
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflowX: "auto"
          }}
        >
          <table
            data-test-id="transactions-table"
            style={{
              width: "100%",
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Payment ID</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Order ID</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Amount</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Method</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    data-test-id="transaction-row"
                    data-payment-id={transaction.id}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td data-test-id="payment-id" style={{ padding: "12px" }}>
                      {transaction.id}
                    </td>
                    <td data-test-id="order-id" style={{ padding: "12px" }}>
                      {transaction.order_id}
                    </td>
                    <td data-test-id="amount" style={{ padding: "12px" }}>
                      {formatAmount(transaction.amount)}
                    </td>
                    <td data-test-id="method" style={{ padding: "12px", textTransform: "uppercase" }}>
                      {transaction.method}
                    </td>
                    <td data-test-id="status" style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          background: getStatusColor(transaction.status) + "20",
                          color: getStatusColor(transaction.status),
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td data-test-id="created-at" style={{ padding: "12px" }}>
                      {formatDate(transaction.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


