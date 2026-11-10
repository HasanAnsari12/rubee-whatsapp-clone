import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/AuthContext";
import { CallProvider } from "./context/CallContext";
import IncomingCallModal from "./components/call/IncomingCallModal";
import CallModal from "./components/call/CallModal";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";

function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <IncomingCallModal />
        <CallModal />
        <BrowserRouter>
          <Routes>
          {/* Public Routes (redirect to / if already authenticated) */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected Home Route */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CallProvider>
  </AuthProvider>
  );
}

export default App;
