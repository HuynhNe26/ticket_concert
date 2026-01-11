import { pool } from "../config/database.js";

export const initZoneSocket = (io) => {
  io.on("connection", (socket) => {
    // Người dùng tham gia vào phòng của Zone cụ thể
    socket.on("event", ({ eventId }) => {
      const roomName = `room_${eventId}`;
      socket.join(roomName);
    });

    // Rời phòng khi chuyển trang
    socket.on("leave_zone", ({ eventId }) => {
      socket.leave(`room_${eventId}`);
    });

    socket.on("zone", async ({ eventId }) => {
      try {
        const query = `
          SELECT
            z.zone_id,
            z.zone_code,
            z.zone_name,
            z.zone_quantity,
            z.sold_quantity,
            (z.zone_quantity - z.sold_quantity) AS available_tickets,
            z.status
          FROM layout l
          JOIN LATERAL jsonb_array_elements(l.layout_json->'zones') AS layout_zone ON true
          JOIN zones z
            ON z.zone_code = layout_zone ->> 'id'
          WHERE l.event_id = $1
          LIMIT 1
        `;

        const { rows } = await pool.query(query, [eventId]);

        if (rows.length) {
          socket.emit("update_ticket_count", rows);
        }
      } catch (err) {
        console.error("Socket Database Error:", err);
      }
    });

    socket.on("disconnect", () => {
      // console.log("User disconnected");
    });
  });
};