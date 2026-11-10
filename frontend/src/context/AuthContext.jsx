// ==========================================================
// frontend/src/context/AuthContext.jsx
// Global Authentication Context & Provider
// ==========================================================

import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import socket from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored && stored !== "undefined" ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync state on initial mount & listen for global unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    // Initial check: if token exists but user doesn't or vice versa, sync
    const currentToken = localStorage.getItem("token");
    const currentUserStr = localStorage.getItem("user");

    if (!currentToken || !currentUserStr) {
      setToken(null);
      setUser(null);
    } else {
      try {
        const parsed = JSON.parse(currentUserStr);
        if (parsed?._id) {
          socket.emit("join", parsed._id);
        }
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    }

    setLoading(false);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  // Login handler
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: receivedToken, ...userInfo } = res.data;

    localStorage.setItem("token", receivedToken);
    localStorage.setItem("user", JSON.stringify(userInfo));

    setToken(receivedToken);
    setUser(userInfo);

    if (userInfo?._id) {
      socket.emit("join", userInfo._id);
    }

    return res.data;
  };

  // Register handler
  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { token: receivedToken, ...userInfo } = res.data;

    localStorage.setItem("token", receivedToken);
    localStorage.setItem("user", JSON.stringify(userInfo));

    setToken(receivedToken);
    setUser(userInfo);

    if (userInfo?._id) {
      socket.emit("join", userInfo._id);
    }

    return res.data;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  // Update user in state and localStorage (e.g. after profile pic update)
  const updateUser = (updated) => {
    setUser((prev) => {
      const nextUser = { ...(prev || {}), ...updated };
      localStorage.setItem("user", JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;

