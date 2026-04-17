import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./zone_ticket.css";

export default function Ticket({ zones  = [], eventId, layout = {}, event={}}) {
    const navigate = useNavigate();

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
        }).format(amount);

    const zoneMap = Object.fromEntries(
        zones.map(z => [z.zone_code, z])
    );

    const mergedZones = (layout?.zones || [])
        .map(layoutZone => {

            const apiZone = zoneMap[layoutZone.id];
            if (!apiZone) return null;

            const available = apiZone.zone_quantity - apiZone.sold_quantity;
            const percentLeft = (available / apiZone.zone_quantity) * 100;

            return {
                ...layoutZone,
                ...apiZone,
                available,
                displayColor: layoutZone.color
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.zone_price - a.zone_price); 

    const eventEnd = new Date(event.event_end).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    return (
        <div className="ticket-list-wrapper">
            <div style={{color: 'white', height: 'auto'}}>
                <h4>{event.event_name}</h4>
                <span>📅 {eventEnd.slice(0, 5)}, {eventEnd.slice(6, 8)} Tháng {eventEnd.slice(9, 11)}, {eventEnd.slice(12, 17)}</span>
                <br />
                <span>📍 {event?.event_location?.split(",")[0]}</span>
                <img style={{width: '100%', height: 'auto', marginTop: '20px'}} src={event.banner_url} />
            </div>
            <div style={{width: '100%', backgroundColor: 'white', height: '1px', marginTop: '20px'}}></div>

            <div className="layout-legend" style={{marginTop: '20px'}}>

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

            {mergedZones.map((z) => {

                const isFull = z.available <= 0;

                return (
                    <div
                        key={z.zone_id}
                        className={'ticket-box'}
                    >

                        <div
                            style={{
                                width: "40px",
                                height: "18px",
                                background: z.displayColor,
                                borderRadius: "4px",
                                marginRight: "10px",
                                marginTop:'5px'
                            }}
                        />

                        <div className="ticket-left">
                            <h5 className="ticket-item-name">
                                {z.zone_name}
                            </h5>

                            <p className="ticket-item-price">
                                {formatCurrency(z.zone_price)}
                            </p>
                        </div>

                    </div>
                );
            })}

        </div>
    );
}