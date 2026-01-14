import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // For development, use test merchant
    if (email === "test@example.com") {
      const merchant = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: email,
        name: "Test Merchant",
        api_key: "key_test_abc123",
        api_secret: "secret_test_xyz789",
        webhook_url: null,
        webhook_secret: "whsec_test_abc123"
      };
      
      localStorage.setItem("auth", JSON.stringify(merchant));
      setLoading(false);
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Use test@example.com");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>💳 Payment Gateway</h1>
        <h2 style={styles.subtitle}>Merchant Login</h2>

        <form data-test-id="login-form" onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <input
              data-test-id="email-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <input
              data-test-id="password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            data-test-id="login-button"
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.hint}>Demo credentials:</p>
          <p style={styles.credentials}>
            Email: <code>test@example.com</code>
          </p>
          <p style={styles.credentials}>
            Password: <code>any password</code>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    padding: "20px"
  },
  card: {
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    width: "100%",
    maxWidth: "450px"
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "32px",
    textAlign: "center",
    color: "#1a1a1a"
  },
  subtitle: {
    margin: "0 0 30px 0",
    fontSize: "18px",
    textAlign: "center",
    color: "#666",
    fontWeight: "normal"
  },
  formGroup: {
    marginBottom: "20px"
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s"
  },
  error: {
    color: "#dc2626",
    marginBottom: "20px",
    fontSize: "14px",
    padding: "10px",
    background: "#fee",
    borderRadius: "6px"
  },
  button: {
    width: "100%",
    padding: "12px",
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
    marginTop: "30px",
    padding: "20px",
    background: "#f9f9f9",
    borderRadius: "6px",
    textAlign: "center",
    fontSize: "14px"
  },
  hint: {
    color: "#666",
    margin: "0 0 10px 0",
    fontWeight: "600"
  },
  credentials: {
    color: "#999",
    margin: "8px 0",
    fontSize: "13px"
  }
};
