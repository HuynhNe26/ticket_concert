import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import LayoutZone from "../layout_zone/layout_zone";
import Ticket from "../zone_ticket/zone_ticket";
import "./zone.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;
const socket = io(`${API_BASE_URL}`)

export default function Zone() {
  const { id } = useParams();
  const [zones, setZones] = useState([]);
  const [layout, setLayout] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(API_BASE_URL);
    socketRef.current.emit("join_event_room", { eventId: id });

    socketRef.current.on("update_ticket_count", setZones);

    Promise.all([
      fetch(`${API_BASE_URL}/api/zone/${id}`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/layout/${id}`).then(r => r.json())
    ]).then(([zonesRes, layoutRes]) => {
      if (zonesRes.success) setZones(zonesRes.data);
      if (layoutRes.success) setLayout(layoutRes.data.layout_json);
    });

    return () => {
      socketRef.current.emit("leave_event_room", { eventId: id });
      socketRef.current.disconnect();
    };
  }, [id]);

  return (
    <div className="booking-page-wrapper">
      <div className="zone-container">
        {layout && zones.length > 0 && (
          <>
            <LayoutZone layout={layout} zones={zones} eventId={id} />
            <Ticket zones={zones} eventId={id} />
          </>
        )}
      </div>
    </div>
  );
}