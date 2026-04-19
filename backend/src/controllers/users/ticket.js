import { success } from "zod";
import { pool } from "../../config/database.js";

export const TicketControllers = {
    async myTicket(req, res) {
        const userId = req.user.userId;

        try {
            const query = `
                SELECT 
                    u.*,
                    p.*,
                    pd.*,
                    e.*,
                    z.*,
                    v.voucher_code        AS voucher_code
                FROM users u
                LEFT JOIN payments p ON p.user_id = u.user_id
                LEFT JOIN payment_detail pd ON pd.payment_id = p.payment_id
                LEFT JOIN events e ON e.event_id = pd.event_id
                LEFT JOIN zones z ON z.zone_id = pd.zone_id
                LEFT JOIN vouchers v ON v.voucher_id = pd.voucher_id
                WHERE u.user_id = $1
                ORDER BY p.created_at DESC
            `;

            const { rows } = await pool.query(query, [userId]);

            const validRows = rows.filter((item) => item.event_id !== null);

            if (validRows.length === 0) {
                return res.status(200).json({
                    success: false,
                    message: "Không có dữ liệu"
                });
            }

            res.status(200).json({
                success: true,
                message: "Lấy dữ liệu vé thành công!",
                data: rows
            });

        } catch (err) {
            console.error("Lỗi lấy vé:", err);
            return res.status(500).json({
                success: false,
                message: "Lỗi server!",
                error: err.message
            });
        }
    }
};