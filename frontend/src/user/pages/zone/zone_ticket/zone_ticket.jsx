import React from "react";
import { useNavigate } from "react-router-dom";
import "./zone_ticket.css";

export default function Ticket({ zones, eventId }) {
  const navigate = useNavigate();

  // Hàm định dạng tiền tệ VND
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  return (
    <div className="ticket-list-container">
      <h3 className="ticket-list-title">Danh sách hạng vé</h3>
      
      {zones.length > 0 ? (
        zones.map((z) => {
          // Tính toán số lượng vé dựa trên bảng zones
          const available = z.zone_quantity - z.sold_quantity;
          const isFull = available <= 0;

          return (
            <div 
              key={z.zone_id} 
              className={`ticket-item-card ${isFull ? "sold-out" : ""}`}
            >
              <div className="ticket-item-info">
                <div className="ticket-item-name">
                  {z.zone_name} 
                  <span className="ticket-code-tag">{z.zone_code}</span>
                </div>
                <div className="ticket-item-price">
                  {formatCurrency(z.zone_price)}
                </div>
                <div className="ticket-item-desc">{z.zone_description}</div>
              </div>

              <div className="ticket-item-action">
                <div className="ticket-remaining">
                  Còn lại: <strong>{available}</strong> / {z.zone_quantity}
                </div>
                <button
                  className="btn-select-ticket"
                  disabled={isFull}
                  onClick={() => navigate(`/event/${eventId}/booking/${z.zone_id}`)}
                >
                  {isFull ? "Hết vé" : "Chọn vé"}
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="no-ticket-notify">Đang tải danh sách vé...</div>
      )}
    </div>
  );
}