import { pool } from "../../config/database.js";

export const TicketQRController = {
    async scanQR(req, res) {
        if (req.admin.level !== 2) {
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

            // 1. Tìm vé theo ticket_qr trong bảng payments, lock row
            const { rows } = await client.query(
                `SELECT
                    p.payment_id,
                    p.ticket_qr,
                    p.payment_ref,
                    p.method,
                    p.created_at,
                    pd.payment_detail_id,
                    pd.ticket_quantity,
                    pd.ticket_status,
                    pd.price,
                    pd.total_price,
                    e.event_name,
                    e.event_end,
                    e.event_location,
                    e.banner_url,
                    z.zone_name,
                    u.email
                FROM payments p
                JOIN payment_detail pd ON pd.payment_id = p.payment_id
                JOIN events         e  ON pd.event_id   = e.event_id
                JOIN zones          z  ON pd.zone_id    = z.zone_id
                JOIN users          u  ON p.user_id     = u.user_id
                WHERE p.ticket_qr = $1
                FOR UPDATE OF p, pd`,
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

            // 3. Vé đã sử dụng 
            if (ticket.ticket_status) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    success: false,
                    message: "Vé này đã được sử dụng trước đó",
                    ticket: formatTicket(ticket),
                });
            }

            // 4. Đánh dấu đã dùng + ghi thời gian
            await client.query(
                `UPDATE payment_detail
                 SET ticket_status = true, useat = NOW()
                 WHERE payment_detail_id = $1`,
                [ticket.payment_detail_id]
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

    // Thêm vào TicketQRController
async getInfo(req, res) {
    if (req.admin.level !== 2) {
        return res.status(403).json({ success: false, message: "Không có quyền" });
    }

    const { qr_code } = req.body;

    if (!qr_code?.trim()) {
        return res.status(400).json({ success: false, message: "QR code không hợp lệ" });
    }

    try {
        const { rows } = await pool.query(
            `SELECT
                p.payment_ref, p.method, p.created_at,
                pd.payment_detail_id, pd.ticket_quantity,
                pd.ticket_status, pd.price, pd.total_price,
                e.event_name, e.event_end, e.event_location,
                z.zone_name, u.email
            FROM payments p
            JOIN payment_detail pd ON pd.payment_id = p.payment_id
            JOIN events         e  ON pd.event_id   = e.event_id
            JOIN zones          z  ON pd.zone_id    = z.zone_id
            JOIN users          u  ON p.user_id     = u.user_id
            WHERE p.ticket_qr = $1`,
            [qr_code.trim()]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy vé" });
        }

        const ticket = rows[0];

        if (ticket.ticket_status) {
            return res.status(409).json({
                success: false,
                message: "Vé này đã được sử dụng trước đó",
                ticket: formatTicket(ticket),
            });
        }

        return res.status(200).json({
            success: true,
            ticket: formatTicket(ticket),
        });

    } catch (err) {
        console.error("Lỗi lấy thông tin vé:", err);
        return res.status(500).json({ success: false, message: "Lỗi server!" });
    }
},
};

function formatTicket(row) {
    return {
        payment_ref:     row.payment_ref,
        event_name:      row.event_name,
        zone_name:       row.zone_name,
        ticket_quantity: row.ticket_quantity,
        fullname:        row.fullname,
        email:           row.email,
    };
}