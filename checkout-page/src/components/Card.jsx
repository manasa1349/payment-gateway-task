export default function Card({ children }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        maxWidth: "420px",
        width: "100%"
      }}
    >
      {children}
    </div>
  );
}