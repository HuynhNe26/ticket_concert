import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";
import LoginPage from "../login/Loginpage";

const API_BASE = process.env.REACT_APP_API_URL;

const FEE_RATE = 0.15;
const ORDER_FEE = 10000;

export default function CartPage() {
  const [item, setItem] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("MOMO");
  const [paying, setPaying] = useState(false);
  const [text, setText] = useState("")
  const [openLogin, setOpenLogin] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setText("Vui lòng đăng nhập để xem!")
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success || !json.data) {
          navigate("/");
          return;
        }
        console.log(json)
        setItem(json.data);
        setExpiresAt(json.data.expires_at);
      } catch (err) {
        console.error("Error fetching cart:", err);
        alert("Lỗi khi tải giỏ hàng");
        navigate("/");
      }
    };
    fetchData();
  }, [navigate, token]);
    console.log("expiresAt:", expiresAt);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000
      );
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        alert("Hết thời gian giữ vé");
        navigate("/");
      } else {
        setTimeLeft(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, navigate]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const fmt = (n) => n?.toLocaleString("vi-VN") + "₫";

  const subtotal = item ? item.zone_price * item.quantity : 0;
  const fees = Math.round(subtotal * FEE_RATE);
  const total = subtotal + fees + ORDER_FEE;

  const handleCheckout = async () => {
    setPaying(true);
    try {
      if (paymentMethod === "MOMO") {
        // Gia hạn cart trước
        await fetch(`${API_BASE}/api/cart/extend`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });

        // Tạo link MoMo
        const res = await fetch(`${API_BASE}/api/checkout/momo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: total,
            orderId: `ORDER_${item.user_id}_${Date.now()}`
          })
        });

        const data = await res.json();
        if (data.payUrl) {
          window.location.href = data.payUrl; // redirect sang MoMo
        } else {
          alert(data.error || "Lỗi tạo link MoMo");
        }

      } else if (paymentMethod === "VNPAY") {
        // Tương tự khi làm VNPAY
        alert("VNPAY đang phát triển");
      }

    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối");
    } finally {
      setPaying(false);
    }
  };

  if (!token) {
    return (
      <div style={{color: 'white', textAlign: 'center', alignContent: 'center', fontSize: '20px'}}>
        {text}
        <br />
        {/* {item.length === 0 (() => { */}
          <button 
          style={{
            backgroundColor: 'transparent', 
            color: 'white', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: '18px'
          }}
          onClick={() => setOpenLogin(true)}>
              Đăng nhập
          </button>
          {openLogin && (
            <div className="login-popup" onClick={() => setOpenLogin(false)}>
              <div onClick={(e) => e.stopPropagation()}>
                <LoginPage />
              </div>
            </div>
          )}
        {/* })} */}
      </div>
    )
  }

  return (
    <div>
        {/* TIMER */}
      <div className="timer-banner">
        <span className="timer-icon">⏱</span>
        Hoàn tất thanh toán trong
        <span className={`timer-value ${timeLeft > 0 && timeLeft <= 60 ? "warning" : ""}`}>
          {formatTime(timeLeft)}
        </span>
        để giữ vé.
      </div>

      <div className="page-wrapper">
        <h1 className="page-title">GIỎ HÀNG</h1>

        <div className="cart-layout">
          {/* LEFT */}
          <div className="tickets-section">

            {/* Thông tin vé */}
            {item && (
              <div className="ticket-card" key={item.id}>
                <div className="ticket-info">
                  <div className="ticket-event-name">{item.event_name}</div>
                  <span className="ticket-zone">{item.zone_name}</span>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
                    📍 {item.event_location}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                    🎤 {item.event_actor}
                  </div>
                  <span className="ticket-zone">
                    {item.zone_name}
                  </span>
                  
                </div>

                <div className="ticket-right">
                  <div className="ticket-price">
                    <div className="price-unit">
                      Đơn giá: {fmt(item.zone_price)}
                    </div>
                    <div className="price-subtotal">
                      Số lượng: {item.quantity}
                    </div>
                    <div className="price-subtotal">
                      Thành tiền:{" "}
                      <span>{fmt(item.zone_price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thông tin khách hàng */}
            {item && (
              <div className="customer-card">
                <div className="customer-title">Thông tin người mua</div>
                <div className="customer-row">
                  <span>Họ tên</span>
                  <strong>{item.fullname}</strong>
                </div>
                <div className="customer-row">
                  <span>Email</span>
                  <strong>{item.email}</strong>
                </div>
                <div className="customer-row">
                  <span>Số điện thoại</span>
                  <strong>{item.phonenumber}</strong>
                </div>
                <div className="customer-row">
                  <span>Giới tính</span>
                  <strong>{item.gender}</strong>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <aside className="order-summary">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-line">
              <span>Tạm tính ({item?.quantity} vé)</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Phí dịch vụ (15%)</span>
              <span>{fmt(fees)}</span>
            </div>
            <div className="summary-line">
              <span>Phí xử lý</span>
              <span>{fmt(ORDER_FEE)}</span>
            </div>

            <hr className="summary-divider" />

            <div className="summary-total-row">
              <span>TỔNG CỘNG</span>
              <span>{fmt(total)}</span>
            </div>

            {/* Phương thức thanh toán */}
            <div className="pay-method-title">Phương thức</div>
            <div className="pay-methods">
              {[
                { id: "MOMO", logo: "/logoMoMo.png" },
                { id: "VNPAY", logo: "/logoVNpay.png" }
              ].map((m) => (
                <button
                  key={m.id}
                  className={`pay-method-btn ${paymentMethod === m.id ? "active" : ""}`}
                  onClick={() => setPaymentMethod(m.id)}
                >
                  <img src={m.logo} alt={m.id} style={{ height: 28, objectFit: "contain" }} />
                </button>
              ))}
            </div>

            <p className="hint-text">
              Hoàn tất trong{" "}
              <strong>{formatTime(timeLeft)}</strong>
            </p>

            <button
              className="btn-pay"
              disabled={timeLeft <= 0 || !item || paying}
              onClick={handleCheckout}
            >
              {paying ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}