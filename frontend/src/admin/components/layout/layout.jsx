import './layout.css'
import Navbar from "../navbar/navbar";
import { Outlet } from "react-router-dom";
import { useAdminAuth } from "../../context/authAdmin";
import LoadingAdmin from "../loading/loading";
import { Navigate } from "react-router-dom";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const API_BASE = process.env.REACT_APP_API_URL;

export default function LayoutAdmin() {

    const { isLoggedIn, loading } = useAdminAuth();

    const [alerts, setAlerts] = useState([]);

    const alertedEvents = useRef(new Set());

    useEffect(() => {

        const socket = io(API_BASE);

        socket.on("connect", () => {
            socket.emit("join_admin");
        });

        socket.on("hotEvents", (events) => {
            events.forEach(event => {

            const percent =
            (Number(event.ticketssold) / Number(event.totaltickets)) * 100;

            const eventId = event.event_id;

            if (percent >= 100 && !alertedEvents.current.has(`sold_${eventId}`)) {

                showAlert({
                    type: "soldout",
                    message: `🚫 Sự kiện "${event.event_name}" đã hết vé`
                });

                alertedEvents.current.add(`sold_${eventId}`);
            }

            else if (percent >= 90 && !alertedEvents.current.has(`warn_${eventId}`)) {

                showAlert({
                    type: "warning",
                    message: `⚠️ Sự kiện "${event.event_name}" sắp hết vé`
                });

                alertedEvents.current.add(`warn_${eventId}`);
            }

            });

        });

        const timer = setInterval(() => {
            socket.emit("request");
        }, 1000);

        return () => {
            clearInterval(timer);
            socket.off("hotEvents");
            socket.disconnect();
        };

    }, []);

    const showAlert = (alert) => {

        const id = Date.now();

        setAlerts(prev => [...prev, { ...alert, id }]);

        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, 7000);

    };

    const closeAlert = (id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    if (loading) return <LoadingAdmin />;
    if (!isLoggedIn) return <Navigate to="/admin/login" replace />;

    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>

            <Navbar />

            {alerts.length > 0 && (
                <div className="admin-alert-container">
                    {alerts.map(alert => (
                        <div key={alert.id} className={`admin-alert ${alert.type}`}>

                            <span>{alert.message}</span>

                            <button
                                className="alert-close"
                                onClick={() => closeAlert(alert.id)}
                            >
                                ✕
                            </button>

                        </div>
                    ))}
                </div>
            )}

            <div style={{ background: "white" }}>
                <Outlet />
            </div>

        </div>
    );
}