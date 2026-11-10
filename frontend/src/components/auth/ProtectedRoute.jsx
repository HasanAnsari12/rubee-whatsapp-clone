// ==========================================================
// frontend/src/components/auth/ProtectedRoute.jsx
// Route wrapper to guard authenticated screens
// ==========================================================

import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0f0a14] text-[#a08096]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E63E6D] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

