import { pool } from "../../config/database.js";

export const OrderControllers = {
    async getOrderById(req, res) {
        try {
            const { id } = req.params

            let query = 
            `   SELECT 
                    p.*,
                    pd. *,
                    e.*
                FROM payments p
                JOIN payment_detail pd ON pd.payment_id = p.payment_id
                JOIN events e ON pd.event_id = e.event_id
                WHERE pd.event_id = $1
            `

            const { rows } = await pool.query(query, id)

            if (rows.length === 0) {
                res.status(403).json({
                    success: false,
                    message: "Không có dữ liệu đơn hàng cho sự kiện trên!"
                })
            } else {
                res.status(200).json({
                    success: true,
                    message: "Lấy dữ liệu đơn hàng thành công!",
                    data: rows
                })
            }
        } catch (err) {

        }
    }
}

