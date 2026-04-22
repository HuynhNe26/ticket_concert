import { pool } from "../../config/database.js";

export const TicketQRController = {
    async scanQR(req, res) {

        if (req.user.level !== 2) {
            return res.status(403).json({
                success: false,
                message: "Chỉ nhân viên trực tiếp mới được thực hiện check-in",
            });
        }

        const { qr_code } = req.body;

        if (!qr_code || typeof qr_code !== "string" || !qr_code.trim()) {
            return res.status(400).json({
                success: false,
                message: "QR code không hợp lệ",
            });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Tìm vé theo ticket_qr, lock row
            const { rows } = await client.query(
                `SELECT
                    t.ticket_id,
                    t.ticket_status,
                    t.ticket_quantity,
                    t.ticket_qr,
                    pd.payment_detail_id,
                    pd.price,
                    pd.total_price,
                    pd.payment_ref,
                    pd.method,
                    pd.created_at,
                    e.event_name,
                    e.event_end,
                    e.event_location,
                    e.banner_url,
                    z.zone_name,
                    u.full_name,
                    u.email
                FROM tickets t
                JOIN payment_detail pd ON t.payment_detail_id = pd.payment_detail_id
                JOIN payments       p  ON pd.payment_id       = p.payment_id
                JOIN events         e  ON pd.event_id         = e.event_id
                LEFT JOIN zones     z  ON pd.zone_id          = z.zone_id
                LEFT JOIN users     u  ON p.user_id           = u.user_id
                WHERE t.ticket_qr = $1
                FOR UPDATE`,
                [qr_code.trim()]
            );

            // 2. Không tìm thấy
            if (rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy vé",
                });
            }

            const ticket = rows[0];

            // 3. Vé đã sử dụng (ticket_status = false)
            if (!ticket.ticket_status) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    success: false,
                    message: "Vé này đã được sử dụng trước đó",
                    ticket: formatTicket(ticket),
                });
            }

            // 4. Đánh dấu đã dùng
            await client.query(
                `UPDATE tickets SET ticket_status = false WHERE ticket_id = $1`,
                [ticket.ticket_id]
            );

            // 5. Ghi log — admin_id của staff đang quét
            await client.query(
                `INSERT INTO check_in_logs (ticket_id, scanned_by, scanned_at)
                 VALUES ($1, $2, NOW())`,
                [ticket.ticket_id, req.user.admin_id]
            );

            await client.query("COMMIT");

            return res.status(200).json({
                success: true,
                message: "Check-in thành công",
                ticket: formatTicket(ticket),
            });

        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Lỗi check-in:", err);
            return res.status(500).json({
                success: false,
                message: "Lỗi server!",
                error: err.message,
            });
        } finally {
            client.release();
        }
    },
};

function formatTicket(row) {
    return {
        ticket_id:       row.ticket_id,
        payment_ref:     row.payment_ref,
        event_name:      row.event_name,
        event_end:       row.event_end,
        event_location:  row.event_location,
        banner_url:      row.banner_url,
        zone_name:       row.zone_name,
        ticket_quantity: row.ticket_quantity,
        price:           row.price,
        total_price:     row.total_price,
        method:          row.method,
        created_at:      row.created_at,
        full_name:       row.full_name,
        email:           row.email,
    };
}