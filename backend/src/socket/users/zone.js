import { pool } from "../../config/database.js";

export const initZoneSocket = (io) => {
  io.on("connection", (socket) => {
    // Người dùng tham gia vào phòng của Zone cụ thể
    socket.on("join_zone", ({ eventId, zoneId }) => {
      const roomName = `room_${eventId}_${zoneId}`;
      socket.join(roomName);
      // console.log(`User ${socket.id} joined ${roomName}`);
    });

    // Rời phòng khi chuyển trang
    socket.on("leave_zone", ({ eventId, zoneId }) => {
      socket.leave(`room_${eventId}_${zoneId}`);
    });

    // Lắng nghe yêu cầu cập nhật mỗi 10 giây từ Client
    socket.on("request_refresh_tickets", async ({ eventId, zoneId }) => {
      try {
        // Truy vấn dựa trên database bạn vừa cập nhật
        const query = `
          SELECT 
            zone_id, 
            zone_name, 
            zone_quantity, 
            sold_quantity, 
            (zone_quantity - sold_quantity) as available_tickets
          FROM zones 
          WHERE event_id = $1 AND zone_id = $2
        `;
        
        const { rows } = await pool.query(query, [eventId, zoneId]);
        
        if (rows.length > 0) {
          // Gửi dữ liệu về cho CHỈ người dùng vừa yêu cầu
          socket.emit("update_ticket_count", rows[0]);
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