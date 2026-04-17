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

export default function CartPage() {
  const [item, setItem] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("MOMO");
  const [paying, setPaying] = useState(false);
  const [text, setText] = useState("");
  const [openLogin, setOpenLogin] = useState(false);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Voucher picker (inline dropdown)
  const [showPicker, setShowPicker] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Notification states
  const [warning, setWarning] = useState({ show: false, message: "" });
  const [success, setSuccess] = useState({ show: false, message: "" });
  const [error, setError]     = useState({ show: false, message: "" });

  const showWarning = (message) => setWarning({ show: true, message });
  const showSuccess = (message) => setSuccess({ show: true, message });
  const showError   = (message) => setError({ show: true, message });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setText("Vui lòng đăng nhập để xem!");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) {
          showWarning("Không có vé trong giỏ, vui lòng mua vé!");
          setTimeout(() => {
          window.location.href = "/"; }, 2000);
          return;
        }
        if (!json.data) { setItem(null); return; }
        setItem(json.data);
        setExpiresAt(json.data.expires_at);
      } catch (err) {
        console.error("Error fetching cart:", err);
        showError("Lỗi khi tải giỏ hàng");
        setTimeout(() => navigate("/"), 1500);
      }
    };
    fetchData();
  }, [navigate, token]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000
      );
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        showWarning("Hết thời gian giữ vé");
        setTimeout(() => navigate("/"), 1500);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, navigate]);

  // Đóng picker khi click ra ngoài
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (!e.target.closest(".voucher-picker-wrap")) setShowPicker(false);
    };
    
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const fmt = (n) => n?.toLocaleString("vi-VN") + "₫";

  const subtotal = item ? item.zone_price * item.quantity : 0;

  const calcDiscount = () => {
    if (!voucher) return 0;
    let discount = 0;
    if (voucher.voucher_type) {
      discount = Math.floor((subtotal * voucher.voucher_value) / 100);
      if (voucher.max_reduction) discount = Math.min(discount, voucher.max_reduction);
    } else {
      discount = voucher.voucher_value;
    }
    return Math.min(discount, subtotal);
  };

  const discount = calcDiscount();
  const total = subtotal - discount;

  // ── Fetch danh sách voucher khả dụng ──
  const handleOpenPicker = async () => {
    if (showPicker) { setShowPicker(false); return; }
    setShowPicker(true);
    setPickerLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/vouchers/getvoucher?order_value=${subtotal}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setAvailableVouchers(data.vouchers);
      else setAvailableVouchers([]);
    } catch {
      setAvailableVouchers([]);
    } finally {
      setPickerLoading(false);
    }
  };

  // ── Chọn voucher từ danh sách ──
  const handlePickVoucher = (v) => {
    setVoucher(v);
    setVoucherCode(v.voucher_code);
    setVoucherError("");
    setShowPicker(false);
  };

  // ── Nhập tay + validate ──
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherError("");
    setVoucher(null);
    setVoucherLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/vouchers/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voucher_code: voucherCode.trim(),
          order_value: subtotal,
        }),
      });
      const data = await res.json();
      if (data.success && data.voucher) {
        setVoucher(data.voucher);
        setVoucherError("");
      } else {
        setVoucherError(data.message || "Mã voucher không hợp lệ");
      }
    } catch {
      setVoucherError("Lỗi kết nối khi kiểm tra voucher");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handleDeleteCart = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Đã xóa đơn hàng");
        setTimeout(() => navigate("/"), 1500);
      } else {
        showError(data.message || "Xóa thất bại");
      }
    } catch {
      showError("Lỗi kết nối");
    }
  };

  const handleCheckout = async () => {
    setPaying(true);
    const payload = {
      amount: total,
      orderId: `ORDER_${item.user_id}_${Date.now()}`,
      price: item.zone_price,
      total_price: total,
      voucher_id: voucher?.voucher_id || null,
    };

    try {
      const endpoint =
        paymentMethod === "MOMO"
          ? `${API_BASE}/api/checkout/momo`
          : `${API_BASE}/api/checkout/vnpay`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        showError(data.error || "Lỗi tạo link thanh toán");
      }
    } catch {
      showError("Lỗi kết nối");
    } finally {
      setPaying(false);
    }
  };

  // ── Tính discount preview cho 1 voucher ──────────────────────────────────
  const previewDiscount = (v) => {
    let d = 0;
    if (v.voucher_type) {
      d = Math.floor((subtotal * v.voucher_value) / 100);
      if (v.max_reduction) d = Math.min(d, v.max_reduction);
    } else {
      d = v.voucher_value;
    }
    return Math.min(d, subtotal);
  };

  if (!token) {
    return (
      <div style={{ color: "white", textAlign: "center", alignContent: "center", fontSize: "20px" }}>
        {text}
        <br />
        <button
          style={{ backgroundColor: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "18px" }}
          onClick={() => setOpenLogin(true)}
        >
          Đăng nhập
        </button>
        {openLogin && (
          <div className="login-popup" onClick={() => setOpenLogin(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <LoginPage />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Warning  show={warning.show} message={warning.message} onClose={() => setWarning({ show: false, message: "" })} />
      <Success  show={success.show} message={success.message} onClose={() => setSuccess({ show: false, message: "" })} />
      <ErrorNotif show={error.show} message={error.message}   onClose={() => setError({ show: false, message: "" })} />

      <div className="page-wrapper">
        <h1 className="page-title">THANH TOÁN</h1>

        <div className="cart-layout">

          {/* ── CỘT TRÁI ── */}
          <div className="cart-left">

            {/* Ô 1: Thông tin nhận vé */}
            {item && (
              <div className="cart-section-card">
                <div className="cart-section-title">Thông tin nhận vé</div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                  Vé điện tử sẽ được hiển thị trong mục{" "}
                  <strong style={{ color: "#fff" }}>"Vé của tôi"</strong> của tài khoản{" "}
                  <strong style={{ color: "#fff" }}>{item.email}</strong>
                </p>
              </div>
            )}

            {/* Ô 2: Mã khuyến mãi */}
            <div className="cart-section-card">
              <div className="cart-section-title-row">
                <span className="cart-section-title">Mã khuyến mãi</span>
              </div>

              {/* Voucher đã chọn */}
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
                      placeholder="Nhập mã voucher"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyVoucher()}
                      disabled={voucherLoading}
                    />
                    <button
                      className="voucher-pick-btn"
                      onClick={handleOpenPicker}
                      title="Chọn từ danh sách"
                    >
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

                  {/* Nút chọn từ danh sách + dropdown */}
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
                            <div
                              key={v.voucher_id}
                              className="voucher-dropdown-item"
                              onClick={() => handlePickVoucher(v)}
                            >
                              <div className="vdi-left">
                                <div className="vdi-code">{v.voucher_code}</div>
                                <div className="vdi-desc">{v.description}</div>
                                <div className="vdi-meta">
                                  {v.min_order_value > 0 && (
                                    <span>Đơn tối thiểu {fmt(v.min_order_value)}</span>
                                  )}
                                  <span>HSD: {fmtDate(v.voucher_end)}</span>
                                  <span>Còn {v.voucher_quantity - v.voucher_used} lượt</span>
                                </div>
                              </div>
                              <div className="vdi-right">
                                <div className="vdi-value">
                                  {v.is_percent
                                    ? `−${v.voucher_value}%`
                                    : `−${fmt(v.voucher_value)}`}
                                </div>
                                <div className="vdi-save">
                                  Tiết kiệm {fmt(previewDiscount(v))}
                                </div>
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

            {/* Ô 3: Phương thức thanh toán */}
            <div className="cart-section-card">
              <div className="cart-section-title">Phương thức thanh toán</div>
              <div className="pay-method-list">
                {[
                  { id: "MOMO",  logo: "/logoMoMo.png",  label: "MoMo" },
                  { id: "VNPAY", logo: "/logoVNpay.png", label: "VNPAY/Ứng dụng ngân hàng" },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`pay-method-row ${paymentMethod === m.id ? "active" : ""}`}
                    onClick={() => setPaymentMethod(m.id)}
                  >
                    <div className="pay-radio">
                      <div className={`pay-radio-dot ${paymentMethod === m.id ? "checked" : ""}`} />
                    </div>
                    <img src={m.logo} alt={m.id} style={{ height: 28, objectFit: "contain" }} />
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
                  <span>Thông tin đặt vé</span>
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
                    <div className="summary-qty">0{item.quantity}</div>
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
                  <span className="discount-value">- {fmt(discount)}</span>
                </div>
              )}

              <div className="summary-timer-hint">
                ⏱ Hoàn tất đặt vé trong{" "}
                <strong className="timer-highlight">{formatTime(timeLeft)}</strong>
              </div>

              <hr className="summary-divider" />

              <div className="summary-total-row">
                <span>Tổng tiền</span>
                <span className="summary-total-value">{fmt(total)}</span>
              </div>

              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 16, lineHeight: 1.5 }}>
                Bằng việc tiến hành đặt mua, bạn đã đồng ý với{" "}
                <span style={{ color: "#00FFD4", cursor: "pointer" }}>Điều Kiện Giao Dịch Chung</span>
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
                    🗑 Xóa đơn hàng
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