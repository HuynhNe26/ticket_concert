import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import "./login.css";
import {jwtDecode} from "jwt-decode"; // sửa import đúng

const API_BASE = "http://localhost:5000/api";
console.log("Google Client ID:", process.env.REACT_APP_GOOGLE_CLIENT_ID);

export default function LoginPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // register form
  const [fullname, setFullname] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [birthOfDay, setBirthOfDay] = useState("");
  const [gender, setGender] = useState("");

  // helper lưu token + user + expire
  const saveToken = (data) => {
    const decoded = jwtDecode(data.token);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("tokenExpire", decoded.exp * 1000); // ms
  };

  // ================= LOGIN =================
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "Đăng nhập thất bại");
        return;
      }

      saveToken(data); // lưu token + expire
      setMsg("Đăng nhập thành công!");
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      setMsg("Lỗi mạng: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================= REGISTER =================
  async function handleRegister(e) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!phone.match(/^0\d{9}$/)) {
      setMsg(
        "Số điện thoại không hợp lệ (phải có 10 chữ số, bắt đầu bằng 0)."
      );
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullname,
          birthOfDay,
          email,
          password,
          phoneNumber: phone,
          gender,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "Đăng ký thất bại");
        return;
      }

      setMsg("Đăng ký thành công! Chuyển đến trang đăng nhập...");
      setTimeout(() => setTab("login"), 1000);
    } catch (err) {
      setMsg("Lỗi mạng: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================= GOOGLE LOGIN =================
  const handleGoogleLogin = async (credentialResponse) => {
    const tokenId = credentialResponse?.credential;
    if (!tokenId) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/login-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "Đăng nhập Google thất bại");
        return;
      }

      saveToken(data); // lưu token + expire
      setMsg("Đăng nhập Google thành công!");
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      setMsg("Lỗi mạng: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <div className="login-wrap">
        <div className="login-side">
          <div className="auth-card">
            <div className="brand">
              <img src="/logo.svg" alt="Logo" />
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab ${tab === "login" ? "active" : ""}`}
                onClick={() => {
                  setMsg("");
                  setTab("login");
                }}
              >
                Đăng nhập
              </button>
              <button
                className={`tab ${tab === "register" ? "active" : ""}`}
                onClick={() => {
                  setMsg("");
                  setTab("register");
                }}
              >
                Đăng ký
              </button>
            </div>

            {tab === "login" && (
              <form className="form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email hoặc số điện thoại"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="input-with-addon">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="addon"
                    onClick={() => setShowPwd(!showPwd)}
                  >
                    {showPwd ? "Ẩn" : "Hiện"}
                  </button>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>

                <div className="divider">HOẶC</div>

                <div className="google-login">
                  <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    onError={() => console.log("Login Failed")}
                  />
                </div>

                {msg && <p className="msg">{msg}</p>}
              </form>
            )}

            {tab === "register" && (
              <form className="form" onSubmit={handleRegister}>
                <input
                  type="text"
                  placeholder="Họ và tên"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <label className="label">Ngày sinh *</label>
                <input
                  type="date"
                  className="input"
                  value={birthOfDay}
                  onChange={(e) => setBirthOfDay(e.target.value)}
                  required
                />
                <label className="label">Giới tính *</label>
                <select
                  className="input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">-- Chọn giới tính --</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>

                <input
                  type="tel"
                  placeholder="Số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <div className="input-with-addon">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="addon"
                    onClick={() => setShowPwd(!showPwd)}
                  >
                    {showPwd ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Xác nhận mật khẩu"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />

                <button type="submit" disabled={loading}>
                  {loading ? "Đang đăng ký..." : "Đăng ký"}
                </button>

                {msg && <p className="msg">{msg}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}