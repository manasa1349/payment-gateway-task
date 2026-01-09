import { useSearchParams } from "react-router-dom";

export default function Failure() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");

  return (
    <div
      data-test-id="error-state"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#fef2f2",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>❌</div>
        <h2 style={{ color: "#dc2626", marginTop: 0, marginBottom: "20px" }}>Payment Failed</h2>
        {paymentId && (
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontWeight: "bold" }}>Payment ID: </span>
            <span>{paymentId}</span>
          </div>
        )}
        <span data-test-id="error-message" style={{ color: "#991b1b" }}>
          Payment could not be processed. Please try again.
        </span>
      </div>
    </div>
  );
}
