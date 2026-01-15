import { pool } from "../config/database.js";

export const EventSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("join_admin", () => {
            socket.join("admin_dashboard");
        });

        socket.on("join_event", (eventId) => {
            socket.join(`event_${eventId}`);
            console.log(`Joined event_${eventId}`);
        });

        socket.on("leave_event", (eventId) => {
            socket.leave(`event_${eventId}`);
            console.log(`Left event_${eventId}`);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    setInterval(async () => {
        try {
            const { rows } = await pool.query(`
                SELECT 
                    e.event_id,
                    e.event_name,
                    e.event_status,
                    SUM(z.zone_quantity) AS totalTickets,
                    SUM(z.sold_quantity) AS ticketsSold,
                    SUM(z.sold_quantity * z.price) AS revenue
                FROM events e
                JOIN zones z ON e.event_id = z.event_id
                WHERE e.event_status = 'active'
                GROUP BY e.event_id
                ORDER BY ticketsSold DESC
                LIMIT 5
            `);

            io.to("admin_dashboard").emit("hotEvents", rows);
        } catch (err) {
            console.error("🔥 Hot events error:", err);
        }
    }, 3000);
};
