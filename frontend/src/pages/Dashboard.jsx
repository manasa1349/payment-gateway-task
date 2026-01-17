import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1";

export default function Dashboard() {
  const [merchant, setMerchant] = useState(null);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0,
    pendingJobs: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (!auth) {
      navigate("/login");
      return;
    }

    const merchantData = JSON.parse(auth);
    setMerchant(merchantData);

    // Fetch payment statistics
    fetch(`${API_BASE}/payments/list`, {
      headers: {
        "X-Api-Key": merchantData.api_key,
        "X-Api-Secret": merchantData.api_secret
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

          setStats(prev => ({
            ...prev,
            totalTransactions: total,
            totalAmount: totalAmount,
            successRate: successRate
          }));
        }
      })
      .catch((err) => console.log("Failed to fetch stats:", err));

    // Fetch job queue status
    fetch(`${API_BASE}/test/jobs/status`)
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          pendingJobs: data.pending || 0
        }));
      })
      .catch(err => console.log("Failed to fetch job status:", err));
  }, [navigate]);

  if (!merchant) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading...</div>;
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/login");
  };

  return (
    <div style={styles.container} data-test-id="dashboard">
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <h1 style={styles.navTitle}> Payment Gateway</h1>
          <div style={styles.navLinks}>
            <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
            <Link to="/dashboard/transactions" style={styles.navLink}>Transactions</Link>
            <Link to="/dashboard/webhooks" style={styles.navLink}>Webhooks</Link>
            <Link to="/dashboard/docs" style={styles.navLink}>API Docs</Link>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={styles.mainContent}>
        {/* Welcome Section */}
        <section style={styles.welcomeSection}>
          <h2 style={styles.sectionTitle}>Welcome, {merchant.email}</h2>
          <p style={styles.sectionDescription}>
            Manage your payment operations and integration settings from this dashboard.
          </p>
        </section>

        {/* API Credentials */}
        <section style={styles.credentialsSection}>
          <h3 style={styles.sectionHeading}>API Credentials</h3>
          <div style={styles.credentialsGrid}>
            <div style={styles.credentialItem}>
              <label style={styles.credentialLabel}>API Key</label>
              <code data-test-id="api-key" style={styles.credentialValue}>
                {merchant.api_key}
              </code>
            </div>
            <div style={styles.credentialItem}>
              <label style={styles.credentialLabel}>API Secret</label>
              <code data-test-id="api-secret" style={styles.credentialValue}>
                {merchant.api_secret}
              </code>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section style={styles.statsSection}>
          <h3 style={styles.sectionHeading}>Quick Stats</h3>
          <div style={styles.statsGrid} data-test-id="stats-container">
            <StatCard
              label="Total Transactions"
              value={stats.totalTransactions}
              icon="📊"
              color="#667eea"
              testId="total-transactions"
            />
            <StatCard
              label="Total Amount"
              value={formatAmount(stats.totalAmount)}
              icon="💰"
              color="#48bb78"
              testId="total-amount"
            />
            <StatCard
              label="Success Rate"
              value={`${stats.successRate}%`}
              icon="✅"
              color="#f6ad55"
              testId="success-rate"
            />
            <StatCard
              label="Pending Jobs"
              value={stats.pendingJobs}
              icon="⏳"
              color="#ed8936"
              testId="pending-jobs"
            />
          </div>
        </section>

        {/* Quick Links */}
        <section style={styles.linksSection}>
          <h3 style={styles.sectionHeading}>Quick Links</h3>
          <div style={styles.linksGrid}>
            <Link to="/dashboard/transactions" style={{...styles.linkCard, borderLeft: '4px solid #667eea'}}>
              <div style={styles.linkIcon}>📈</div>
              <div style={styles.linkText}>View Transactions</div>
              <small>Monitor all payments and refunds</small>
            </Link>
            <Link to="/dashboard/webhooks" style={{...styles.linkCard, borderLeft: '4px solid #48bb78'}}>
              <div style={styles.linkIcon}>🔔</div>
              <div style={styles.linkText}>Configure Webhooks</div>
              <small>Set up payment event notifications</small>
            </Link>
            <Link to="/dashboard/docs" style={{...styles.linkCard, borderLeft: '4px solid #f6ad55'}}>
              <div style={styles.linkIcon}>📚</div>
              <div style={styles.linkText}>API Documentation</div>
              <small>Integration guide and code samples</small>
            </Link>
          </div>
        </section>

        {/* Feature Highlights */}
        <section style={styles.featuresSection}>
          <h3 style={styles.sectionHeading}>Key Features</h3>
          <ul style={styles.featureList}>
            <li>Async payment processing with job queues</li>
            <li>Webhook delivery with HMAC-SHA256 signatures</li>
            <li>Automatic retry logic with exponential backoff</li>
            <li>Embeddable payment SDK for iframe integration</li>
            <li>Full and partial refund support</li>
            <li>Idempotent API operations</li>
            <li>Production-ready architecture</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, testId }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }} data-test-id={testId}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f7fb",
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
  },
  nav: {
    background: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 100
  },
  navContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "70px"
  },
  navTitle: {
    margin: 0,
    fontSize: "24px",
    color: "#1a1a1a"
  },
  navLinks: {
    display: "flex",
    gap: "30px",
    alignItems: "center"
  },
  navLink: {
    color: "#667eea",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    transition: "color 0.2s",
    cursor: "pointer"
  },
  logoutButton: {
    padding: "8px 16px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500"
  },
  mainContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "40px 20px"
  },
  welcomeSection: {
    marginBottom: "40px"
  },
  sectionTitle: {
    fontSize: "32px",
    color: "#1a1a1a",
    margin: "0 0 10px 0"
  },
  sectionDescription: {
    color: "#666",
    margin: 0,
    fontSize: "16px"
  },
  credentialsSection: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    marginBottom: "40px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  sectionHeading: {
    fontSize: "20px",
    color: "#1a1a1a",
    marginBottom: "20px",
    marginTop: 0
  },
  credentialsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px"
  },
  credentialItem: {
    background: "#f9f9f9",
    padding: "15px",
    borderRadius: "6px",
    border: "1px solid #eee"
  },
  credentialLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#666",
    marginBottom: "8px",
    textTransform: "uppercase"
  },
  credentialValue: {
    display: "block",
    padding: "10px",
    background: "white",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
    wordBreak: "break-all",
    border: "1px solid #ddd"
  },
  statsSection: {
    marginBottom: "40px"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px"
  },
  statCard: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textAlign: "center"
  },
  statIcon: {
    fontSize: "32px",
    marginBottom: "10px"
  },
  statLabel: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "10px",
    fontWeight: "500"
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "700"
  },
  linksSection: {
    marginBottom: "40px"
  },
  linksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px"
  },
  linkCard: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer"
  },
  linkIcon: {
    fontSize: "32px",
    marginBottom: "10px"
  },
  linkText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: "8px"
  },
  featuresSection: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px"
  }
};
