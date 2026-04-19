import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

const API_BASE = process.env.REACT_APP_API_URL;

export default function LoginForm({ onSuccess, onGoogleLogin, onForgotPassword }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Khi tài khoản chưa xác thực → hiện màn chờ
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  // ── Đăng nhập ─────────────────────────────────────────────────────────
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

      if (!res.ok) {
        // Chưa xác thực → backend đã gửi mail, chuyển sang màn chờ
        if (res.status === 403 && data.unverified) {
          setPendingEmail(data.email || email);
          return;
        }
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

  // ── Gửi lại mail xác thực thủ công ────────────────────────────────────
  async function handleResend() {
    setResending(true);
    setResendMsg("");
    try {
      // Gọi lại login với đúng email/password → backend tự gửi lại mail
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.status === 403 && data.unverified) {
        setResendMsg("✅ Đã gửi lại email xác thực!");
      } else {
        setResendMsg("⚠️ Không thể gửi lại, vui lòng thử lại.");
      }
    } catch {
      setResendMsg("⚠️ Lỗi mạng, vui lòng thử lại.");
    } finally {
      setResending(false);
    }
  }

  // ── Màn chờ xác thực ──────────────────────────────────────────────────
  if (pendingEmail) {
    return (
      <div style={styles.verifyBox}>

        <h3 style={styles.verifyTitle}>Xác thực tài khoản của bạn</h3>

        <p style={styles.verifyText}>
          Chúng tôi đã gửi email xác thực đến
        </p>
        <p style={styles.verifyEmail}>{pendingEmail}</p>
        <p style={styles.verifyText}>
          Vui lòng nhấn vào nút trong email để kích hoạt tài khoản.
          <br />
          <span style={styles.expireNote}>⏱ Liên kết có hiệu lực trong <strong>5 phút</strong>.</span>
        </p>

        <p style={styles.verifyHint}>
          Không nhận được mail? Kiểm tra thư mục <em>Spam / Junk</em> hoặc gửi lại bên dưới.
        </p>

        <button
          style={{ ...styles.actionBtn, background: "#334155", marginBottom: "8px" }}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Đang gửi lại..." : "🔄 Gửi lại email xác thực"}
        </button>

        {resendMsg && (
          <p style={{ fontSize: "13px", color: resendMsg.startsWith("✅") ? "#4ade80" : "#f87171", margin: 0 }}>
            {resendMsg}
          </p>
        )}

        <button
          style={styles.actionBtn}
          onClick={() => { setPendingEmail(null); setResendMsg(""); }}
        >
          ← Quay lại đăng nhập
        </button>
      </div>
    );
  }

  // ── Form đăng nhập ─────────────────────────────────────────────────────
  return (
    <>
      <form className="form" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
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

// ── Styles màn chờ xác thực ───────────────────────────────────────────────
const styles = {
  verifyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px",
  },
  iconWrap: {
    fontSize: "52px",
    marginBottom: "4px",
  },
  verifyTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "#c4b5fd",
  },
  verifyEmail: {
    margin: 0,
    fontWeight: 700,
    fontSize: "15px",
    color: "#e2e8f0",
    wordBreak: "break-all",
  },
  verifyText: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: 1.7,
  },
  expireNote: {
    fontSize: "13px",
    color: "#fca5a5",
  },
  verifyHint: {
    margin: 0,
    fontSize: "12px",
    color: "#475569",
  },
  actionBtn: {
    width: "100%",
    padding: "11px 0",
    borderRadius: "8px",
    border: "none",
    background: "#7c3aed",
    color: "#fff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "4px",
  },
};