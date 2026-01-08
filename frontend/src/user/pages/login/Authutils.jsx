import { jwtDecode } from "jwt-decode";

const API_BASE = process.env.REACT_APP_API_URL;

// Helper lưu token + user + expire
export const saveToken = (data) => {
  const decoded = jwtDecode(data.token);
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("tokenExpire", decoded.exp * 1000); // ms
};

// Xử lý đăng nhập Google
export const handleGoogleLoginAPI = async (credentialResponse) => {
  const tokenId = credentialResponse?.credential;
  if (!tokenId) {
    throw new Error("Không có credential từ Google");
  }

  const res = await fetch(`${API_BASE}/api/users/login-google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenId }),
  });
  
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Đăng nhập Google thất bại");
  }

  return data;
};