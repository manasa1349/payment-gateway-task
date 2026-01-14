import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Webhooks from "./pages/Webhooks";
import APIDocumentation from "./pages/APIDocumentation";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/transactions" element={<Transactions />} />
      <Route path="/dashboard/webhooks" element={<Webhooks />} />
      <Route path="/dashboard/docs" element={<APIDocumentation />} />
    </Routes>
  );
}


