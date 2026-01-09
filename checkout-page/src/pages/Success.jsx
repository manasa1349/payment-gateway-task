import { useSearchParams } from "react-router-dom";

export default function Success() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");

  return (
    <div
      data-test-id="success-state"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0fdf4",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>✅</div>
        <h2 style={{ color: "#16a34a", marginTop: 0, marginBottom: "20px" }}>Payment Successful!</h2>
        {paymentId && (
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontWeight: "bold" }}>Payment ID: </span>
            <span data-test-id="payment-id">{paymentId}</span>
          </div>
        )}
        <span data-test-id="success-message" style={{ color: "#166534" }}>
          Your payment has been processed successfully
        </span>
      </div>
    </div>
  );
}
