import React from "react";
import { useNavigate } from "react-router-dom";
import "./zone_ticket.css";

export default function Ticket({ zones, eventId }) {
    const navigate = useNavigate();

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

    return (
        <div className="ticket-list-wrapper">
            <div className="layout-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#4CAF50' }}></span>
          Còn vé
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#FF9800' }}></span>
          Sắp hết (&lt;20%)
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#666666' }}></span>
          Hết vé
        </div>
      </div>
            {zones.map((z) => {
                const available = z.zone_quantity - z.sold_quantity;
                const isFull = available <= 0;

                return (
                    <div key={z.zone_id} className={`ticket-box ${isFull ? 'sold-out' : ''}`}>
                        <div className="ticket-left">
                            <h4 className="ticket-item-name">{z.zone_name}</h4>
                            <p className="ticket-item-price">{formatCurrency(z.zone_price)}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}