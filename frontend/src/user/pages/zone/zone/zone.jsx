import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import LayoutZone from "../layout_zone/layout_zone";
import Ticket from "../zone_ticket/zone_ticket";
import Warning from "../../../components/notification/warning/warning.jsx";
import "./zone.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function Zone() {
  const { id } = useParams();
  const [zones, setZones] = useState([]);
  const [layout, setLayout] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warningMessage, setWarningMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let socket = null;
    let timer = null;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [resZones, resLayout, resEvent] = await Promise.all([
          fetch(`${API_BASE_URL}/api/zone/${id}`),
          fetch(`${API_BASE_URL}/api/layout/${id}`),
          fetch(`${API_BASE_URL}/api/events/${id}`)
        ]);

        const dataZones = await resZones.json();
        const dataLayout = await resLayout.json();
        const dataEvent = await resEvent.json();

        if (dataEvent.success && dataEvent.data) {
          const ev = dataEvent.data;
          setEvent(ev);

          // Kiểm tra sự kiện chưa mở bán
          if (ev.event_status === false) {
            setWarningMessage("Sự kiện chưa mở bán vé, vui lòng quay lại sau!");
            setTimeout(() => {
              navigate(`/event/${id}`, {
                replace: true,
                state: { warning: "Sự kiện chưa mở bán vé, vui lòng quay lại sau!" }
              });
            }, 1500);
            return;
          }

          // Kiểm tra sự kiện đã kết thúc
          if (ev.event_end && new Date(ev.event_end) < new Date()) {
            setWarningMessage("Sự kiện đã kết thúc!");
            setTimeout(() => {
              navigate(`/event/${id}`, {
                replace: true,
                state: { warning: "Sự kiện đã kết thúc!" }
              });
            }, 1500);
            return;
          }
        }

        if (dataZones.success) setZones(dataZones.data);
        if (dataLayout.success) setLayout(dataLayout.data.layout_json);

        // Khởi tạo socket chỉ khi sự kiện hợp lệ và đang mở bán
        socket = io(API_BASE_URL);
        socket.emit("join_event_room", { eventId: id });

        socket.on("update_ticket_count", (updatedZones) => {
          setZones(updatedZones);
        });

        timer = setInterval(() => {
          socket.emit("request_refresh_event_zones", { eventId: id });
        }, 1000);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (socket) {
        socket.emit("leave_event_room", { eventId: id });
        socket.off("update_ticket_count");
        socket.disconnect();
      }
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="booking-page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <p style={{ color: 'white', fontSize: '16px' }}>Đang tải sơ đồ đặt vé...</p>
      </div>
    );
  }

  if (warningMessage || !event || event.event_status === false || (event.event_end && new Date(event.event_end) < new Date())) {
    return (
      <div className="booking-page-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', gap: '16px', color: 'white', textAlign: 'center', padding: '20px' }}>
        <Warning
          show={!!warningMessage}
          message={warningMessage}
          onClose={() => setWarningMessage("")}
        />
        <h2 style={{ fontSize: '22px', fontWeight: 600 }}>{warningMessage || "Sự kiện hiện chưa mở bán vé!"}</h2>
        <p style={{ color: '#94a3b8' }}>Hệ thống đang chuyển hướng bạn về trang thông tin sự kiện...</p>
        <button
          onClick={() => navigate(`/event/${id}`)}
          style={{ padding: '10px 24px', borderRadius: '8px', background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }}
        >
          Quay lại trang sự kiện
        </button>
      </div>
    );
  }

  return (
    <div className="booking-page-wrapper">
      <div className="zone-container">
        <div className="zone-layout">
          <LayoutZone layout={layout} zones={zones} eventId={id} event={event} />
        </div>
        <div className="zone-ticket">
          <Ticket zones={zones} layout={layout} eventId={id} event={event} />
        </div>
      </div>
    </div>
  );
}