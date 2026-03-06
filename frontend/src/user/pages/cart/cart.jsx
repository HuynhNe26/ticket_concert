import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";

const API_BASE = process.env.REACT_APP_API_URL;

const FEE_RATE = 0.15;
const ORDER_FEE = 10;

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState({ name: "", email: "", phone: "" });
  const [timeLeft, setTimeLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ─── FETCH CART & USER ─────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔥 Fetch Cart
        const res = await fetch(`${API_BASE}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();

        if (!json.success || !json.data?.length) {
          navigate("/");
          return;
        }

        const cart = json.data[0];

        // ⚠ Quan trọng: backend phải trả về items + expires_at
        setItems(cart.items || []);
        setExpiresAt(cart.expires_at);

        // 🔥 Fetch User Profile
        const userRes = await fetch(`${API_BASE}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userJson = await userRes.json();
        if (userJson.success) {
          setUser(userJson.data);
        }
      } catch (err) {
        console.error("Cart load error:", err);
        navigate("/");
      }
    };

    fetchData();
  }, [navigate, token]);

  // ─── COUNTDOWN REALTIME ─────────────────────────────
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const diff = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000
      );

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        alert("Hết thời gian giữ chỗ!");
        navigate("/");
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, navigate]);

  // ─── HELPERS ─────────────────────────────
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatUSD = (n) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  // ─── QUANTITY ─────────────────────────────
  const updateQty = (id, delta) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  // ─── CALCULATIONS ─────────────────────────────
  const subtotal = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const fees = subtotal * FEE_RATE;
  const total = subtotal + fees + ORDER_FEE;
  const totalTickets = items.reduce((sum, i) => sum + i.quantity, 0);

  // ─── RENDER ─────────────────────────────
  return (
    <>
      {/* TIMER BANNER */}
      <div className="timer-banner">
        <span className="timer-icon">⏱</span>
        Complete payment within
        <span
          className={`timer-value${
            timeLeft > 0 && timeLeft <= 60 ? " warning" : ""
          }`}
        >
          {formatTime(timeLeft)}
        </span>
        to reserve your tickets.
      </div>

      <div className="page-wrapper">
        <h1 className="page-title">GIỎ HÀNG</h1>

        <div className="cart-layout">
          {/* LEFT — Tickets */}
          <div className="tickets-section">
            {items.map((item) => (
              <div className="ticket-card" key={item.id}>
                <div className="ticket-info">
                  <div className="ticket-event-name">
                    {item.event_name}
                  </div>
                  <span className="ticket-zone">
                    {item.zone_code}
                  </span>
                </div>

                <div className="ticket-right">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="qty-control">
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.id, -1)}
                      >
                        −
                      </button>
                      <span className="qty-value">
                        {item.quantity}
                      </span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.id, 1)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="delete-btn"
                      onClick={() => removeItem(item.id)}
                    >
                      🗑
                    </button>
                  </div>

                  <div className="ticket-price">
                    <div className="price-unit">
                      Unit Price: {formatUSD(item.unitPrice)}
                    </div>
                    <div className="price-subtotal">
                      Subtotal:{" "}
                      <span>
                        {formatUSD(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="total-tickets-row">
              Total tickets: <strong>{totalTickets}</strong>
            </div>
          </div>

          {/* RIGHT — Order Summary */}
          <aside className="order-summary">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-line">
              <span>Subtotal:</span>
              <span>{formatUSD(subtotal)}</span>
            </div>

            <div className="summary-line">
              <span>Service Fees (15%):</span>
              <span>{formatUSD(fees)}</span>
            </div>

            <div className="summary-line">
              <span>Order Fee:</span>
              <span>{formatUSD(ORDER_FEE)}</span>
            </div>

            <hr className="summary-divider" />

            <div className="summary-total-row">
              <span>TOTAL:</span>
              <span>{formatUSD(total)}</span>
            </div>

            <p className="hint-text">
              Complete payment within{" "}
              <strong>{formatTime(timeLeft)}</strong>
            </p>

            <button
              className="btn-pay"
              disabled={timeLeft <= 0 || items.length === 0}
              onClick={() => alert("Proceeding to payment...")}
            >
              Confirm & Pay Now
            </button>
          </aside>
        </div>
      </div>
    </>
  );
}