import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";

const API_BASE = process.env.REACT_APP_API_URL;

const FEE_RATE = 0.15;
const ORDER_FEE = 10;

export default function CartPage() {
  const [item, setItem] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState(null);
  const [user, setUser] = useState([])

  const navigate = useNavigate();
  const token = localStorage.getItem("token");


  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cart`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!json.success || !json.data) {
          navigate("/");
          return;
        }

        setItem(json.data);
        console.log(json.data)
        setExpiresAt(json.data.expires_at);

        const userRes = await fetch(`${API_BASE}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userJson = await userRes.json();
        if (userJson.success) {
          setUser(userJson.data);
        }
      } catch (err) {
        console.error("Error fetching cart:", err);
        alert("Lỗi khi tải giỏ hàng");
        navigate("/");
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

  const formatUSD = (n) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });


  const subtotal = item ? item.zone_price * item.quantity : 0;

  const fees = subtotal * FEE_RATE;
  const total = subtotal + fees + ORDER_FEE;
  const totalTickets = item ? item.quantity : 0;

  return (
    <div>

      {/* TIMER */}
      <div className="timer-banner">
        <span className="timer-icon">⏱</span>

        Complete payment within

        <span
          className={`timer-value ${
            timeLeft > 0 && timeLeft <= 60 ? "warning" : ""
          }`}
        >
          {formatTime(timeLeft)}
        </span>

        to reserve your tickets.
      </div>


      <div className="page-wrapper">

        <h1 className="page-title">
          GIỎ HÀNG
        </h1>


        <div className="cart-layout">


          {/* LEFT */}
          <div
            className="tickets-section"
            style={{ color: "white" }}
          >

            {item && (

              <div
                className="ticket-card"
                key={item.cart_id}
              >

                <div className="ticket-info">

                  <div className="ticket-event-name">
                    Mã sự kiện: {item.event_id}
                  </div>

                  <span className="ticket-zone">
                    {item.zone_name}
                  </span>

                </div>


                <div className="ticket-right">

                  <div className="ticket-price">

                    <div className="price-unit">
                      Unit Price: {item.zone_price?.toLocaleString('vi-VN')}₫
                    </div>

                    <div className="price-subtotal">
                      Quantity:
                      {" "}
                      {item.quantity}
                    </div>

                    <div className="price-subtotal">
                      Subtotal: {(item.zone_price * item.quantity).toLocaleString('vi-VN')}₫
                      
                    </div>

                  </div>

                </div>

              </div>

            )}


            <div className="total-tickets-row">
              Total tickets:
              {" "}
              <strong>
                {totalTickets}
              </strong>
            </div>

          </div>



          {/* RIGHT */}
          <aside className="order-summary">

            <h2 className="summary-title">
              Order Summary
            </h2>


            <div className="summary-line">
              <span>Subtotal:</span>
              <span>
                {subtotal.toLocaleString('vi-VN')}₫
              </span>
            </div>


            <div className="summary-line">
              <span>
                Service Fees (15%)
              </span>

              <span>
               {fees.toLocaleString('vi-VN')}₫
              </span>
            </div>


            <div className="summary-line">
              <span>Order Fee</span>
              <span>
                {ORDER_FEE.toLocaleString('vi-VN')}₫
              </span>
            </div>


            <hr className="summary-divider" />


            <div className="summary-total-row">

              <span>
                TOTAL
              </span>

              <span>
                {total.toLocaleString('vi-VN')}₫
              </span>

            </div>


            <p className="hint-text">
              Complete payment within
              {" "}
              <strong>
                {formatTime(timeLeft)}
              </strong>
            </p>


            <button
              className="btn-pay"
              disabled={timeLeft <= 0 || !item}
              onClick={() =>
                alert("Proceed to payment")
              }
            >
              Confirm & Pay Now
            </button>

          </aside>

        </div>
      </div>
    </div>
  );
}