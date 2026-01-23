import React from "react";
import { useNavigate } from "react-router-dom";
import "./zone_ticket.css";

export default function Ticket({ zones, eventId }) {
    const navigate = useNavigate();

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

    return (
        <div className="ticket-list-wrapper">
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