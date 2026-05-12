import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";
import LoginPage from "../login/Loginpage";
import Warning from "../../components/notification/warning/warning";
import Success from "../../components/notification/success/success";
import ErrorNotif from "../../components/notification/error/error";

const API_BASE = process.env.REACT_APP_API_URL;

function fmtDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtDateFull(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit", minute: "2-digit",
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function CartPage() {
  const [item,          setItem]          = useState(null);
  const [timeLeft,      setTimeLeft]      = useState(0);
  const [expiresAt,     setExpiresAt]     = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("MOMO");
  const [paying,        setPaying]        = useState(false);
  const [text,          setText]          = useState("");
  const [openLogin,     setOpenLogin]     = useState(false);

  // Voucher
  const [voucherCode,       setVoucherCode]       = useState("");
  const [voucher,           setVoucher]           = useState(null);
  const [voucherError,      setVoucherError]      = useState("");
  const [voucherLoading,    setVoucherLoading]    = useState(false);
  const [showPicker,        setShowPicker]        = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [pickerLoading,     setPickerLoading]     = useState(false);

  // Notifications
  const [warning, setWarning] = useState({ show: false, message: "" });
  const [success, setSuccess] = useState({ show: false, message: "" });
  const [error,   setError]   = useState({ show: false, message: "" });

  const showWarning = (msg) => setWarning({ show: true, message: msg });
  const showSuccess = (msg) => setSuccess({ show: true, message: msg });
  const showError   = (msg) => setError({ show: true, message: msg });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) { setText("Vui lòng đăng nhập để xem!"); return; }
      try {
        const res  = await fetch(`${API_BASE}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) {
          showWarning("Không có vé trong giỏ, vui lòng mua vé!");
          setTimeout(() => { window.location.href = "/"; }, 2000);
          return;
        }
        if (!json.data) { setItem(null); return; }
        setItem(json.data);
        setExpiresAt(json.data.expires_at);
      } catch (err) {
        showError("Lỗi khi tải giỏ hàng");
        setTimeout(() => navigate("/"), 1500);
      }
    };
    fetchData();
  }, [navigate, token]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(async() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
         try {
        await fetch(`${API_BASE}/api/cart`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Xóa giỏ hàng thất bại", err);
      }
        showWarning("Hết thời gian giữ vé");
        setTimeout(() => navigate("/"), 1500);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, navigate, token]);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (!e.target.closest(".voucher-picker-wrap")) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  const fmt      = (n) => n?.toLocaleString("vi-VN") + "₫";
  const subtotal = item ? item.zone_price * item.quantity : 0;

  const calcDiscount = () => {
    if (!voucher) return 0;
    let d = voucher.voucher_type
      ? Math.min(Math.floor((subtotal * voucher.voucher_value) / 100), voucher.max_reduction || Infinity)
      : voucher.voucher_value;
    return Math.min(d, subtotal);
  };

  const discount = calcDiscount();
  const total    = subtotal - discount;

  const previewDiscount = (v) => {
    let d = v.voucher_type
      ? Math.min(Math.floor((subtotal * v.voucher_value) / 100), v.max_reduction || Infinity)
      : v.voucher_value;
    return Math.min(d, subtotal);
  };

  const handleOpenPicker = async () => {
    if (showPicker) { setShowPicker(false); return; }
    setShowPicker(true);
    setPickerLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/vouchers/getvoucher?order_value=${subtotal}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAvailableVouchers(data.success ? data.vouchers : []);
    } catch { setAvailableVouchers([]); }
    finally  { setPickerLoading(false); }
  };

  const handlePickVoucher = (v) => {
    setVoucher(v);
    setVoucherCode(v.voucher_code);
    setVoucherError("");
    setShowPicker(false);
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherError(""); setVoucher(null); setVoucherLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/vouchers/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ voucher_code: voucherCode.trim(), order_value: subtotal }),
      });
      const data = await res.json();
      if (data.success && data.voucher) { setVoucher(data.voucher); setVoucherError(""); }
      else setVoucherError(data.message || "Mã voucher không hợp lệ");
    } catch { setVoucherError("Lỗi kết nối khi kiểm tra voucher"); }
    finally  { setVoucherLoading(false); }
  };

  const handleRemoveVoucher = () => { setVoucher(null); setVoucherCode(""); setVoucherError(""); };

  const handleDeleteCart = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      const res  = await fetch(`${API_BASE}/api/cart`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { showSuccess("Đã xóa đơn hàng"); setTimeout(() => navigate("/"), 1500); }
      else showError(data.message || "Xóa thất bại");
    } catch { showError("Lỗi kết nối"); }
  };

  const handleCheckout = async () => {
    setPaying(true);
    const payload = {
      amount: total, orderId: `ORDER_${item.user_id}_${Date.now()}`,
      price: item.zone_price, total_price: total,
      voucher_id: voucher?.voucher_id || null,
    };
    try {
      const endpoint = paymentMethod === "MOMO"
        ? `${API_BASE}/api/checkout/momo`
        : `${API_BASE}/api/checkout/vnpay`;
      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.payUrl) window.location.href = data.payUrl;
      else showError(data.error || "Lỗi tạo link thanh toán");
    } catch { showError("Lỗi kết nối"); }
    finally  { setPaying(false); }
  };

  if (!token) {
    return (
      <div style={{ color: "white", textAlign: "center", paddingTop: 120, fontSize: 18 }}>
        {text}
        <br />
        <button
          style={{ background: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: 16, marginTop: 12 }}
          onClick={() => setOpenLogin(true)}
        >
          Đăng nhập
        </button>
        {openLogin && (
          <div className="login-popup" onClick={() => setOpenLogin(false)}>
            <div onClick={(e) => e.stopPropagation()}><LoginPage /></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Warning   show={warning.show} message={warning.message} onClose={() => setWarning({ show: false, message: "" })} />
      <Success   show={success.show} message={success.message} onClose={() => setSuccess({ show: false, message: "" })} />
      <ErrorNotif show={error.show}  message={error.message}   onClose={() => setError({ show: false, message: "" })} />

      {/* ── BANNER ── */}
      {item && (
        <div className="cart-banner">
          {item.banner_url ? (
            <img className="cart-banner-img" src={item.banner_url} alt={item.event_name} />
          ) : (
            <div className="cart-banner-fallback" />
          )}
          <div className="cart-banner-overlay" />

          <div className="cart-banner-content">
            <div className="cart-banner-info">
              <h2 className="cart-banner-title">{item.event_name}</h2>
              <div className="cart-banner-meta">
                {item.event_start && item.event_end && (
                  <div className="cart-banner-meta-row">
                    {/* calendar icon */}
                    <svg className="cart-banner-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {fmtDateFull(item.event_start)} — {fmtDateFull(item.event_end)}
                  </div>
                )}
                {item.event_location && (
                  <div className="cart-banner-meta-row">
                    {/* pin icon */}
                    <svg className="cart-banner-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {item.event_location}
                  </div>
                )}
              </div>
            </div>

            {/* Countdown */}
            <div className="cart-countdown">
              <div className="cart-countdown-label">Hoàn tất đặt vé trong</div>
              <div className="cart-countdown-digits">
                <div className="cart-digit-box">{mm[0]}</div>
                <div className="cart-digit-box">{mm[1]}</div>
                <div className="cart-countdown-sep">:</div>
                <div className="cart-digit-box">{ss[0]}</div>
                <div className="cart-digit-box">{ss[1]}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="page-wrapper">
        <h1 className="page-title">THANH TOÁN</h1>

        <div className="cart-layout">

          {/* ── CỘT TRÁI ── */}
          <div className="cart-left">

            {/* Thông tin nhận vé */}
            {item && (
              <div className="cart-section-card">
                <div className="cart-section-title">Thông tin nhận vé</div>
                <p className="cart-info-text">
                  Vé điện tử sẽ được hiển thị trong mục{" "}
                  <strong>"Vé của tôi"</strong> của tài khoản{" "}
                  <strong>{item.email}</strong>
                </p>
              </div>
            )}

            {/* Mã khuyến mãi */}
            <div className="cart-section-card">
              <div className="cart-section-title-row">
                <span className="cart-section-title" style={{ marginBottom: 0 }}>Mã khuyến mãi</span>
                <button className="choose-voucher-btn" onClick={handleOpenPicker}>
                  Chọn voucher
                </button>
              </div>

              {voucher ? (
                <div className="voucher-applied">
                  <div className="voucher-applied-info">
                    <span className="voucher-tag">🏷️ {voucher.voucher_code}</span>
                  </div>
                  <button className="voucher-remove-btn" onClick={handleRemoveVoucher}>✕</button>
                </div>
              ) : (
                <>
                  <div className="voucher-input-row">
                    <input
                      className="voucher-input"
                      type="text"
                      placeholder="+ Thêm khuyến mãi"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyVoucher()}
                      disabled={voucherLoading}
                    />
                    <button className="voucher-pick-btn" onClick={handleOpenPicker} title="Chọn từ danh sách">
                      {showPicker ? "▲" : "+"}
                    </button>
                    <button
                      className="voucher-btn"
                      onClick={handleApplyVoucher}
                      disabled={voucherLoading || !voucherCode.trim()}
                    >
                      {voucherLoading ? "..." : "Áp dụng"}
                    </button>
                  </div>

                  <div className="voucher-picker-wrap">
                    {showPicker && (
                      <div className="voucher-dropdown">
                        {pickerLoading ? (
                          <div className="voucher-dropdown-state">
                            <div className="voucher-dropdown-spinner" />
                            <span>Đang tải…</span>
                          </div>
                        ) : availableVouchers.length === 0 ? (
                          <div className="voucher-dropdown-state">
                            🎟 Không có voucher phù hợp với đơn hàng này
                          </div>
                        ) : (
                          availableVouchers.map((v) => (
                            <div key={v.voucher_id} className="voucher-dropdown-item" onClick={() => handlePickVoucher(v)}>
                              <div className="vdi-left">
                                <div className="vdi-code">{v.voucher_code}</div>
                                <div className="vdi-desc">{v.description}</div>
                                <div className="vdi-meta">
                                  {v.min_order_value > 0 && <span>Đơn tối thiểu {fmt(v.min_order_value)}</span>}
                                  <span>HSD: {fmtDate(v.voucher_end)}</span>
                                  <span>Còn {v.voucher_quantity - v.voucher_used} lượt</span>
                                </div>
                              </div>
                              <div className="vdi-right">
                                <div className="vdi-value">
                                  {v.is_percent ? `−${v.voucher_value}%` : `−${fmt(v.voucher_value)}`}
                                </div>
                                <div className="vdi-save">Tiết kiệm {fmt(previewDiscount(v))}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {voucherError && <div className="voucher-error">❌ {voucherError}</div>}
            </div>

            {/* Phương thức thanh toán */}
            <div className="cart-section-card">
              <div className="cart-section-title">Phương thức thanh toán</div>
              <div className="pay-method-list">
                {[
                  { id: "MOMO",  logo: "https://res.cloudinary.com/dzfqqipsx/image/upload/v1776498643/yuzokosxfjqor1g0twvm.jpg",  label: "MoMo" },
                  { id: "VNPAY", logo: "/logoVNpay.png", label: "VNPAY / Ứng dụng ngân hàng" },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`pay-method-row${paymentMethod === m.id ? " active" : ""}`}
                    onClick={() => setPaymentMethod(m.id)}
                  >
                    <div className="pay-radio">
                      <div className={`pay-radio-dot${paymentMethod === m.id ? " checked" : ""}`} />
                    </div>
                    <img src={m.logo} alt={m.id} className="pay-method-logo" />
                    <span className="pay-method-label">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* ── CỘT PHẢI ── */}
          <aside className="order-summary">

            {item && (
              <div className="summary-ticket-box">
                <div className="summary-ticket-header">
                  <span className="summary-ticket-header-title">Thông tin đặt vé</span>
                  <button className="reselect-btn" onClick={() => navigate(-1)}>Chọn lại vé</button>
                </div>
                <div className="summary-ticket-cols">
                  <span>Loại vé</span>
                  <span>Số lượng</span>
                </div>
                <div className="summary-ticket-row">
                  <div>
                    <div className="summary-zone-name">{item.zone_name}</div>
                    <div className="summary-zone-price">{fmt(item.zone_price)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="summary-qty">
                      {String(item.quantity).padStart(2, "0")}
                    </div>
                    <div className="summary-zone-price">{fmt(subtotal)}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="summary-order-box">
              <div className="summary-order-title">Thông tin đơn hàng</div>

              <div className="summary-line">
                <span>Tạm tính</span>
                <span>{fmt(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="summary-line discount-line">
                  <span>Giảm giá</span>
                  <span className="discount-value">− {fmt(discount)}</span>
                </div>
              )}

              <hr className="summary-divider" />

              <div className="summary-total-row">
                <span>Tổng tiền</span>
                <span className="summary-total-value">{fmt(total)}</span>
              </div>

              <p className="summary-tos">
                Bằng việc tiến hành đặt mua, bạn đã đồng ý với <br />
                <span className="summary-tos-link">Điều Kiện Giao Dịch Chung</span>
              </p>

              <div className="cart-actions">
                <button
                  className="btn-pay"
                  disabled={timeLeft <= 0 || !item || paying}
                  onClick={handleCheckout}
                >
                  {paying ? "Đang xử lý..." : "Thanh toán"}
                </button>
                {item && (
                  <button className="btn-delete-cart" onClick={handleDeleteCart}>
                    Hủy thanh toán
                  </button>
                )}
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}