import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import LayoutZone from "../layout_zone/layout_zone";
import Ticket from "../zone_ticket/zone_ticket";
import "./zone.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;
const socket = io(`${API_BASE_URL}`);

export default function Zone() {
  const { id } = useParams();
  const [zones, setZones] = useState([]);
  const [layout, setLayout] = useState(null);
  const [event, setEvent] = useState({})

  useEffect(() => {
    socket.emit("join_event_room", { eventId: id });

    const fetchData = async () => {
      try {
        const [resZones, resLayout, resEvent] = await Promise.all([
          fetch(`${API_BASE_URL}/api/zone/${id}`),
          fetch(`${API_BASE_URL}/api/layout/${id}`),
          fetch(`${API_BASE_URL}/api/events/${id}`)
        ]);

        const dataZones = await resZones.json();
        const dataLayout = await resLayout.json();
        const dataEvent = await resEvent.json();

        console.log(dataZones)

        if (dataZones.success) setZones(dataZones.data);
        if (dataLayout.success) setLayout(dataLayout.data.layout_json);
        if (dataEvent.success) setEvent(dataEvent.data);
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
          <LayoutZone layout={layout} zones={zones} eventId={id} event={event} />
        </div>
        <div className="zone-ticket">
          <Ticket zones={zones} layout={layout} eventId={id} event={event} />
        </div>
      </div>
    </div>
  );
}