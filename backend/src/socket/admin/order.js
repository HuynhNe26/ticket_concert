import { pool } from "../../config/database.js";

export const OrderSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("Admin connect order:", socket.id);

        socket.on("join_admin", () => {
            socket.join("admin_dashboard");
        });

        socket.on("join_event", ({ eventId }) => {
            socket.join(`event_${eventId}`);
        });

        socket.on("leave_event", (eventId) => {
            socket.leave(`event_${eventId}`);
        });

        socket.on("requestOrderEvents", async ({eventId}) => {
            try {
                const { rows } = await pool.query(`
                    SELECT p.*,
                       pd.*,
                       e.*,
                       u.*
                    FROM payments p
                    JOIN payment_detail pd ON pd.payment_id = p.payment_id
                    JOIN events e ON pd.event_id = e.event_id
                    JOIN users u ON u.user_id = p.user_id
                    WHERE pd.event_id = $1
                `, [eventId]);

                io.to("admin_dashboard").emit("orderEvent", rows);

            } catch (err) {
                console.error("Order events error:", err);
            }
        });

            socket.on("disconnect", () => {
            console.log("Admin disconnected:", socket.id);
        });
    });
};
