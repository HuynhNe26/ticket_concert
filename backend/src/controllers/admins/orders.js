import { pool } from "../../config/database.js";

export const OrderControllers = {

    async getOrderById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT p.*,
                       pd.*,
                       e.*
                FROM payments p
                JOIN payment_detail pd ON pd.payment_id = p.payment_id
                JOIN events e ON pd.event_id = e.event_id
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
                       pd.*
                FROM payments p
                JOIN payment_detail pd ON pd.payment_id = p.payment_id
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