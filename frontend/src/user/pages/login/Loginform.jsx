import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import OtpModal from "./reset_password";

const API_BASE = process.env.REACT_APP_API_URL;

export default function LoginForm({ onSuccess, onGoogleLogin, onForgotPassword}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        setMsg(data?.message || "Đăng nhập thất bại");
        return;
      }

      onSuccess(data);
    } catch (err) {
      setMsg("Lỗi mạng: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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

        <button className="btn_register" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {/* ── Quên mật khẩu → mở modal ── */}
        <p
          onClick={onForgotPassword}
          style={{
            color: "white",
            marginTop: "20px",
            textAlign: "center",
            fontSize: "13px",
            cursor: "pointer",
            textDecoration: "underline",
            userSelect: "none",
          }}
        >
          Quên mật khẩu
        </p>

        <div className="divider">HOẶC</div>

        <div className="google-login">
          <GoogleLogin
            onSuccess={onGoogleLogin}
            onError={() => console.log("Login Failed")}
          />
        </div>

        {msg && <p className="msg">{msg}</p>}
      </form>
    </>
  );
}