import { pool } from "../../config/database.js";

export const EventSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("Admin connect event:", socket.id);

        socket.on("join_admin", () => {
            socket.join("admin_dashboard");
        });

        socket.on("join_event", (eventId) => {
            socket.join(`event_${eventId}`);
        });

        socket.on("leave_event", (eventId) => {
            socket.leave(`event_${eventId}`);
            console.log(`Left event_${eventId}`);
        });

        socket.on("requestHotEvents", async () => {
            try {
                const { rows } = await pool.query(`
                    SELECT 
                        e.event_id,
                        e.event_name,
                        e.event_status,
                        SUM(z.zone_quantity) AS totalTickets,
                        SUM(z.sold_quantity) AS ticketsSold,
                        SUM(z.sold_quantity * z.zone_price) AS revenue,
                        c.category_name
                    FROM events e
                    JOIN zones z ON e.event_id = z.event_id
                    JOIN categories c ON e.category_id = c.category_id
                    WHERE  e.event_end >= NOW()
                            AND e.event_status = true
                    GROUP BY e.event_id, c.category_name
                    ORDER BY ticketsSold DESC
                    LIMIT 5
                `);

                io.to("admin_dashboard").emit("hotEvents", rows);

            } catch (err) {
                console.error("🔥 Hot events error:", err);
            }
        });

        socket.on("requestAllEvents", async ({ offset = 0, limit = 5 } = {}) => {
            try {
                const { rows } = await pool.query(`
                    SELECT 
                        e.event_id,
                        e.event_name,
                        e.event_status,
                        e.event_start,
                        e.event_location,
                        SUM(z.zone_quantity) AS totalTickets,
                        SUM(z.sold_quantity) AS ticketsSold,
                        SUM(z.sold_quantity * z.zone_price) AS revenue,
                        c.category_name,
                        COUNT(*) OVER() AS total_count   -- tổng số để biết còn hay không
                    FROM events e
                    JOIN zones z ON e.event_id = z.event_id
                    JOIN categories c ON e.category_id = c.category_id
                    GROUP BY e.event_id, c.category_name
                    ORDER BY e.event_start DESC
                    LIMIT $1 OFFSET $2
                `, [limit, offset]);

                socket.emit("allEvents", {
                    events: rows,
                    offset,
                    total: rows[0]?.total_count ?? 0,
                });

            } catch (err) {
                console.error("🔥 All events error:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("Admin disconnected event:", socket.id);
        });
    });
};
