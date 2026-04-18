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

// ── OTP Modal ──────────────────────────────────────────────
function OtpModal({ email, onClose, onSuccess }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index, value) => {
    // Accept only 1 digit
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError("");

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
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
      onSuccess(data);
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
    console.log(email)
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

          <button className="otp-close" onClick={onClose}>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [done, setDone] = useState(false);

  const validateEmail = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Email không hợp lệ.");
      return;
    }

    console.log(email)

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
    setDone(true);
  };

  return (
    <div className="rp-page">
      <div className="rp-card">
        {done ? (
          /* ── Success State ── */
          <div className="rp-success">
            <div className="rp-success-icon">
              <CheckIcon />
            </div>
            <h2>Xác thực thành công!</h2>
            <p style={{ marginTop: 8 }}>
              Tài khoản đã được xác minh.<br />
              Bạn có thể đặt lại mật khẩu ngay bây giờ.
            </p>
            {/* TODO: redirect to new password page */}
          </div>
        ) : (
          <>
            {/* ── Icon ── */}
            <div className="rp-icon-wrap">
              <LockIcon />
            </div>

            {/* ── Header ── */}
            <h1 className="rp-title">Quên mật khẩu?</h1>
            <p className="rp-subtitle">
              Nhập email của bạn và chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.
            </p>

            {/* ── Form ── */}
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
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, stroke: "currentColor" }}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
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

            {/* ── Back ── */}
            <div className="rp-back">
              <a href="/login">
                <ArrowLeftIcon />
                Quay lại đăng nhập
              </a>
            </div>
          </>
        )}
      </div>

      {/* ── OTP Modal ── */}
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