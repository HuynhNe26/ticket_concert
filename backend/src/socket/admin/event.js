import { pool } from "../../config/database.js";

export const EventSocket = (io) => {
    io.on("connection", (socket) => {
        socket.on("join_admin", () => {
            console.log("Admin join dashboard (event):", socket.id);
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
                        SUM(z.sold_quantity::bigint * z.zone_price::bigint) AS revenue,
                        c.category_name
                    FROM events e
                    JOIN zones z ON e.event_id = z.event_id
                    JOIN categories c ON e.category_id = c.category_id
                    WHERE  e.event_end >= NOW()
                            AND e.event_status = true
                    GROUP BY e.event_id, c.category_name
                    ORDER BY ticketsSold DESC
                `);

                io.to("admin_dashboard").emit("hotEvents", rows);

            } catch (err) {
                console.error("🔥 Hot events error:", err);
            }
        });

        socket.on("requestAllEvents", async ({ offset = 0, limit = 5, search = "", status = "all", category = "all", year = "" } = {}) => {
            try {
                let whereClause = "WHERE 1=1";
                const params = [];
                let paramIndex = 1;

                if (search && search.trim() !== "") {
                    whereClause += ` AND (e.event_name ILIKE $${paramIndex} OR e.event_location ILIKE $${paramIndex})`;
                    params.push(`%${search.trim()}%`);
                    paramIndex++;
                }

                if (status && status !== "all") {
                    whereClause += ` AND e.event_status = $${paramIndex}`;
                    params.push(status === "true" || status === true);
                    paramIndex++;
                }

                if (category && category !== "all") {
                    whereClause += ` AND (c.category_name ILIKE $${paramIndex} OR e.category_id::text = $${paramIndex})`;
                    params.push(category);
                    paramIndex++;
                }

                if (year) {
                    whereClause += ` AND EXTRACT(YEAR FROM e.event_start) = $${paramIndex}`;
                    params.push(Number(year));
                    paramIndex++;
                }

                const query = `
                    SELECT 
                        e.event_id,
                        e.event_name,
                        e.event_status,
                        e.event_start,
                        e.event_end,
                        e.event_location,
                        e.category_id,
                        c.category_name,
                        SUM(z.zone_quantity) AS totalTickets,
                        SUM(z.sold_quantity) AS ticketsSold,
                        SUM(z.sold_quantity::bigint * z.zone_price::bigint) AS revenue,
                        COUNT(*) OVER() AS total_count
                    FROM events e
                    JOIN zones z ON e.event_id = z.event_id
                    JOIN categories c ON e.category_id = c.category_id
                    ${whereClause}
                    GROUP BY e.event_id, c.category_name, e.category_id
                    ORDER BY e.event_start DESC
                    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
                `;
                params.push(limit, offset);

                const { rows } = await pool.query(query, params);

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
