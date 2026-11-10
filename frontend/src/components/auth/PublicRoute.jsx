// ==========================================================
// frontend/src/components/auth/PublicRoute.jsx
// Route wrapper to redirect already logged-in users away from auth pages
// ==========================================================

import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0f0a14] text-[#a08096]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E63E6D] border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;

