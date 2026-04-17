import { pool } from "../../config/database.js";

export const OrderControllers = {

    async getOrderById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT p.*,
                       pd.*,
                       e.*,
                       u.*
                FROM payments p
                JOIN payment_detail pd ON pd.payment_id = p.payment_id
                JOIN events e ON pd.event_id = e.event_id
                JOIN users u ON u.user_id = p.user_id
                WHERE pd.event_id = $1
            `;

            const { rows } = await pool.query(query, [id]);

            res.status(200).json({
                success: true,
                message: "Lấy dữ liệu đơn hàng thành công!",
                data: rows
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Lỗi server"
            });
        }
    },

    async seeOrderDetail(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Không lấy được id đơn hàng!"
                });
            }

            const query = `
                SELECT p.*,
                       pd.*,
                       u.*,
                       e.*,
                       z.*,
                       m.*
                FROM payments p
                JOIN payment_detail pd ON pd.payment_id = p.payment_id
                JOIN users u ON u.user_id = p.user_id
                JOIN zones z ON z.zone_id = pd.zone_id
                JOIN events e ON e.event_id = pd.event_id
                JOIN members m ON m.member_id = u.member_id
                WHERE p.payment_id = $1
            `;

            const { rows } = await pool.query(query, [id]);

            res.status(200).json({
                success: true,
                message: "Lấy chi tiết đơn hàng thành công!",
                data: rows
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Lỗi server"
            });
        }
    }

};