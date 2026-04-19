import React, { useState, useRef, useEffect } from "react";
import "./reset_password.css";

const API_BASE = process.env.REACT_APP_API_URL;

// ── SVG Icons ──────────────────────────────────────────────
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12,19 5,12 12,5"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const EyeIcon = ({ off }) =>
  off ? (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

// ── OTP Modal ──────────────────────────────────────────────
function OtpModal({ email, onClose, onSuccess }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError("");
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async () => {
    const otp = digits.join("");
    if (otp.length < 6) {
      setError("Vui lòng nhập đủ 6 số.");
      triggerShake();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/users/checkotp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Mã OTP không đúng.");
      onSuccess();
    } catch (err) {
      setError(err.message);
      triggerShake();
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    try {
      await fetch(`${API_BASE}/api/users/forgetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="otp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="otp-modal">
        <div className="otp-badge">
          <span className="otp-badge-dot" />
          Xác thực OTP
        </div>
        <h2>Kiểm tra email của bạn</h2>
        <p>
          Chúng tôi đã gửi mã 6 chữ số đến<br />
          <strong>{email}</strong>
        </p>
        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              className={`otp-digit ${d ? "filled" : ""} ${shake ? "error-shake" : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>
        {error && (
          <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 16, marginTop: -10 }}>
            {error}
          </p>
        )}
        <div className="otp-actions">
          <button
            className="rp-btn"
            onClick={handleSubmit}
            disabled={loading || digits.join("").length < 6}
          >
            <span className="rp-btn-inner">
              {loading && <span className="rp-spinner" />}
              {loading ? "Đang xác thực..." : "Xác nhận mã"}
            </span>
          </button>
          <div className="otp-resend">
            Không nhận được mã?
            <button onClick={handleResend} disabled={!canResend}>
              {canResend ? "Gửi lại" : `Gửi lại sau ${countdown}s`}
            </button>
          </div>
          <button className="otp-close" onClick={onClose}>Quay lại</button>
        </div>
      </div>
    </div>
  );
}

// ── New Password Form ──────────────────────────────────────
function NewPasswordForm({ email, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/resetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }), 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Cập nhật thất bại. Thử lại sau.");
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-card">
      <h1 className="rp-title">Đặt mật khẩu mới</h1>
      <p className="rp-subtitle">Nhập mật khẩu mới cho tài khoản <strong>{email}</strong></p>

      <form className="rp-form" onSubmit={handleSubmit} noValidate>
        {/* Mật khẩu mới */}
        <div className="rp-field">
          <label className="rp-label">Mật khẩu mới</label>
          <div className="rp-input-wrap">
            <input
              className={`rp-input ${error ? "error" : ""}`}
              type={showPw ? "text" : "password"}
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            <span className="rp-eye" onClick={() => setShowPw((v) => !v)}>
              <EyeIcon off={!showPw} />
            </span>
          </div>
        </div>

        {/* Xác nhận mật khẩu */}
        <div className="rp-field">
          <label className="rp-label">Xác nhận mật khẩu</label>
          <div className="rp-input-wrap">
            <input
              className={`rp-input ${error ? "error" : ""}`}
              type={showCf ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            />
            <span className="rp-eye" onClick={() => setShowCf((v) => !v)}>
              <EyeIcon off={!showCf} />
            </span>
          </div>
          {error && (
            <span className="rp-error-msg">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ width: 13, height: 13, stroke: "currentColor" }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
              </svg>
              {error}
            </span>
          )}
        </div>

        <button className="rp-btn" type="submit" disabled={loading}>
          <span className="rp-btn-inner">
            {loading && <span className="rp-spinner" />}
            {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </span>
        </button>
      </form>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(false);

  // "email" → "newPassword" → "done"
  const [step, setStep] = useState("email");

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Vui lòng nhập địa chỉ email."); return; }
    if (!validateEmail(email)) { setError("Email không hợp lệ."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/forgetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể gửi email. Thử lại sau.");
      setShowOtp(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setShowOtp(false);
    setStep("newPassword");
  };

  const handleDone = () => setStep("done");

  if (step === "newPassword") {
    return (
      <div className="rp-page">
        <NewPasswordForm email={email} onDone={handleDone} />
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-success">
            <h2>Đặt lại mật khẩu thành công!</h2>
            <p style={{ marginTop: 8 }}>
              Mật khẩu của bạn đã được cập nhật.<br />
              Hãy đăng nhập lại với mật khẩu mới.
            </p>
            <a href="/" className="rp-btn" style={{ marginTop: 24, display: "block", textAlign: "center" }}>
              Đăng nhập ngay
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rp-page">
      <div className="rp-card">
        <h1 className="rp-title">Quên mật khẩu?</h1>
        <p className="rp-subtitle">
          Nhập email của bạn và chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.
        </p>

        <form className="rp-form" onSubmit={handleSubmit} noValidate>
          <div className="rp-field">
            <label className="rp-label" htmlFor="rp-email">Địa chỉ Email</label>
            <div className="rp-input-wrap">
              <input
                id="rp-email"
                className={`rp-input ${error ? "error" : ""}`}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
              />
              <MailIcon />
            </div>
            {error && (
              <span className="rp-error-msg">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 13, height: 13, stroke: "currentColor" }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
                </svg>
                {error}
              </span>
            )}
          </div>

          <button className="rp-btn" type="submit" disabled={loading}>
            <span className="rp-btn-inner">
              {loading && <span className="rp-spinner" />}
              {loading ? "Đang gửi..." : "Gửi mã xác thực"}
            </span>
          </button>
        </form>

        <div className="rp-back">
          <a href="/"><ArrowLeftIcon />Quay lại đăng nhập</a>
        </div>
      </div>

      {showOtp && (
        <OtpModal
          email={email}
          onClose={() => setShowOtp(false)}
          onSuccess={handleOtpSuccess}
        />
      )}
    </div>
  );
}