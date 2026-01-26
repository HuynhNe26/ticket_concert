import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    socket.emit("join_event_room", { eventId: id });

    const fetchData = async () => {
      try {
        const [resZones, resLayout] = await Promise.all([
          fetch(`${API_BASE_URL}/api/zone/${id}`),
          fetch(`${API_BASE_URL}/api/layout/${id}`)
        ]);
        const dataZones = await resZones.json();
        const dataLayout = await resLayout.json();

        if (dataZones.success) setZones(dataZones.data);
        if (dataLayout.success) setLayout(dataLayout.data.layout_json);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();

    socket.on("update_ticket_count", (updatedZones) => {
      setZones(updatedZones);
    });

    const timer = setInterval(() => {
      socket.emit("request_refresh_event_zones", { eventId: id });
    }, 1000);

    return () => {
      socket.emit("leave_event_room", { eventId: id });
      socket.off("update_ticket_count");
      clearInterval(timer);
    };
  }, [id]);

  return (
    <div className="booking-page-wrapper">
      <div className="zone-container">
        <div className="zone-layout">
          <LayoutZone layout={layout} zones={zones} />
        </div>
        <div className="zone-ticket">
          <Ticket zones={zones} eventId={id} />
        </div>
      </div>
    </div>
  );
}