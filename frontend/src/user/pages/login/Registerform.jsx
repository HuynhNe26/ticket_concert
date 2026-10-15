import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import BirthDatePicker from "../../components/date_picker/BirthDatePicker";

const API_BASE = process.env.REACT_APP_API_URL;

export default function RegisterForm({ onSuccess, onGoogleLogin }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showPwc, setShowPwc] = useState(false);
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [birthOfDay, setBirthOfDay] = useState("");
  const [gender, setGender] = useState("");
  const [registered, setRegistered] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();

    if (password !== confirm) {
      setMsg({ text: "Mật khẩu xác nhận không khớp.", type: "error" });
      return;
    }
    if (!phone.match(/^0\d{9}$/)) {
      setMsg({ text: "Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0).", type: "error" });
      return;
    }
    if (!birthOfDay) {
      setMsg({ text: "Vui lòng chọn ngày sinh.", type: "error" });
      return;
    }

    setLoading(true);
    setMsg({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
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
        setMsg({ text: data?.message || "Đăng ký thất bại.", type: "error" });
        return;
      }

      setRegistered(true);
    } catch (err) {
      setMsg({ 
        text: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  }

  // ── Màn hình chờ xác thực email ──────────────────────────────────────────
  if (registered) {
    return (
      <div style={styles.verifyBox}>
        <h3 style={styles.verifyTitle}>Kiểm tra hộp thư của bạn!</h3>
        <p style={styles.verifyText}>Chúng tôi đã gửi email xác thực đến</p>
        <p style={styles.verifyEmail}>{email}</p>
        <p style={styles.verifyText}>
          Vui lòng nhấn vào nút trong email để kích hoạt tài khoản.
          <br />
          <span style={styles.expireNote}>Liên kết có hiệu lực trong <strong>5 phút</strong>.</span>
        </p>
        <p style={styles.verifyHint}>
          Không nhận được mail? Hãy kiểm tra thư mục <em>Spam / Junk</em>.
        </p>
        <button style={styles.backBtn} onClick={() => onSuccess && onSuccess()}>
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  // ── Form đăng ký ─────────────────────────────────────────────────────────
  return (
    <form className="form" onSubmit={handleRegister}>

      {/* 1. Họ và tên */}
      <div className="field">
        <label className="field-label" style={{ color: "white" }}>Họ và tên</label>
        <input
          type="text"
          placeholder="Nguyễn Văn A"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          required
        />
      </div>

      {/* 2. Email */}
      <div className="field">
        <label className="field-label" style={{ color: "white" }}>Email</label>
        <input
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {/* 3. Số điện thoại */}
      <div className="field">
        <label className="field-label" style={{ color: "white" }}>Số điện thoại</label>
        <input
          type="tel"
          placeholder="0xxxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      {/* 4. Ngày sinh + Giới tính — 2 cột */}
      <div className="field-row">
        <div className="field">
          <label className="field-label" style={{ color: "white" }}>Ngày sinh</label>
          <BirthDatePicker
            id="register-birthofday"
            value={birthOfDay}
            onChange={(val) => setBirthOfDay(val)}
            placeholder="dd/mm/yyyy"
            required
          />
        </div>
        <div className="field">
          <label className="field-label" style={{ color: "white" }}>Giới tính</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            style={{ height: "45px" }}
          >
            <option value="">Chọn</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>
        </div>
      </div>

      {/* 5. Mật khẩu */}
      <div className="field">
        <label className="field-label" style={{ color: "white" }}>Mật khẩu</label>
        <div className="input-with-addon">
          <input
            type={showPwd ? "text" : "password"}
            placeholder="Tối thiểu 8 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button type="button" className="addon" onClick={() => setShowPwd(!showPwd)}>
            {showPwd ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </div>

      {/* 6. Xác nhận mật khẩu */}
      <div className="field">
        <label className="field-label" style={{ color: "white" }}>Xác nhận mật khẩu</label>
        <div className="input-with-addon">
          <input
            type={showPwc ? "text" : "password"}
            placeholder="Nhập lại mật khẩu"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button type="button" className="addon" onClick={() => setShowPwc(!showPwc)}>
            {showPwc ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </div>

      {/* 7. Nút đăng ký */}
      <button className="btn_register" disabled={loading}>
        {loading ? "Đang đăng ký..." : "Đăng ký"}
      </button>

      {msg.text && (
        <p className="msg" style={{ color: msg.type === "error" ? "#f87171" : "#4ade80" }}>
          {msg.text}
        </p>
      )}

      {/* 8. Divider + Google */}
      {onGoogleLogin && (
        <>
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>hoặc</span>
            <span style={styles.dividerLine} />
          </div>

          <div style={styles.googleWrap}>
            <GoogleLogin
              onSuccess={onGoogleLogin}
              onError={() =>
                setMsg({ text: "Đăng nhập Google thất bại.", type: "error" })
              }
              useOneTap={false}
              width="100%"
              text="continue_with"
              shape="rectangular"
              theme="filled_black"
              locale="vi"
            />
          </div>
        </>
      )}
    </form>
  );
}

const styles = {
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "4px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255,255,255,0.15)",
  },
  dividerText: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)",
    whiteSpace: "nowrap",
  },
  googleWrap: {
    display: "flex",
    justifyContent: "center",
  },

  // ── verify screen ──
  verifyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px",
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
  backBtn: {
    marginTop: "12px",
    padding: "10px 28px",
    borderRadius: "8px",
    border: "none",
    background: "#7c3aed",
    color: "#fff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
};