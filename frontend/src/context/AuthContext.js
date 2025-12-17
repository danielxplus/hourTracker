import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get("/me");
        if (res.data && res.data.displayName !== "אורח") {
          setUser(res.data);
          localStorage.setItem("isAuthenticated", "true");
        } else {
          setUser(null);
          localStorage.removeItem("isAuthenticated");
        }
      } catch {
        setUser(null);
        localStorage.removeItem("isAuthenticated");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const res = await api.get("/me");
      if (res.data && res.data.displayName !== "אורח") {
        setUser(res.data);
        localStorage.setItem("isAuthenticated", "true");
      } else {
        setUser(null);
        localStorage.removeItem("isAuthenticated");
      }
    } catch {
      setUser(null);
      localStorage.removeItem("isAuthenticated");
    }
  };

  async function logout() {
    try {
      await api.post("http://localhost:8080/logout");
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem("isAuthenticated");
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

