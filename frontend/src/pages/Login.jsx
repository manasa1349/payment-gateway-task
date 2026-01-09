import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000/api/v1";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // For Deliverable 1, we use simple email-based authentication
    // The test merchant email is test@example.com
    if (email === "test@example.com") {
      // Store merchant info in localStorage
      localStorage.setItem("merchantEmail", email);
      localStorage.setItem("merchantApiKey", "key_test_abc123");
      localStorage.setItem("merchantApiSecret", "secret_test_xyz789");
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Use test@example.com");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f3f4f6",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px"
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "30px", textAlign: "center" }}>
          Payment Gateway Login
        </h2>
        <form data-test-id="login-form" onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <input
              data-test-id="email-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <input
              data-test-id="password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box"
              }}
            />
          </div>
          {error && (
            <div style={{ color: "#dc2626", marginBottom: "20px", fontSize: "14px" }}>
              {error}
            </div>
          )}
          <button
            data-test-id="login-button"
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Login
          </button>
        </form>
        <div style={{ marginTop: "20px", fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
          Use email: test@example.com (any password)
        </div>
      </div>
    </div>
  );
}


