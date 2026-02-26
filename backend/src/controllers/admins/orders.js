import { pool } from "../../config/database.js";

export const Orders_Controllers = {
    async getEvent (res, req) {
        try {
            const {month, year} = req.query;

            let query = `
                SELECT event_name, event_start, event_end, event_id
                FROM event
                WHERE EXTRACT(MONTH FROM event_date) = $1
                EXTRACT(YEAR FROM event_date) = $2
            `

            const { data } = await pool.query(query, {month, year})
            if (!data) {
                res.status(403).json({
                    message: 'Không có sự kiện nào trong khoảng thời gian trên!',
                    success: false
                })
            }

            res.status(200).json({
                message: 'Lấy dữ liệu sự kiện thành công!',
                success: true,
                data: data
            })
        } catch (err) {

        }
    }
}

