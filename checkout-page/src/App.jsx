import { Routes, Route, Navigate } from "react-router-dom";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import Failure from "./pages/Failure";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/checkout" />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/success" element={<Success />} />
      <Route path="/failure" element={<Failure />} />
    </Routes>
  );
}