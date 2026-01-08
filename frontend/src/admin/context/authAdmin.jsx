import React, { createContext, useContext, useState, useEffect } from "react";

const AuthAdminContext = createContext();
const API_BASE = process.env.REACT_APP_API_URL;
export function AuthAdminProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`https://ticket-concert.onrender.com/api/admin/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdmin(data.admin);
      setIsLoggedIn(true);
    } catch {
      localStorage.removeItem("authToken");
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(`https://ticket-concert.onrender.com/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log(data)
      if (!response.ok) throw new Error(data.error || "Đăng nhập thất bại");

      localStorage.setItem("authToken", data.token);
      setIsLoggedIn(true);
      setAdmin(data.admin);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setIsLoggedIn(false);
    setAdmin(null);
  };

  return (
    <AuthAdminContext.Provider value={{ isLoggedIn, admin, login, logout, loading }}>
      {children}
    </AuthAdminContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthAdminContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
}
