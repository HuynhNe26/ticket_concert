import { pool } from "../../config/database.js";

export const StatisticControllers = {
async getCalendarEvents(req, res) {
    try {
      const { month, year } = req.query;
      let query = `
        SELECT 
          e.event_id,
          e.event_name, -- Lưu ý: Đổi tên cột này cho khớp với bảng events của bạn (ví dụ: e.title, e.name)
          e.event_start,
          e.event_end,
          SUM(z.zone_quantity)::int AS total_tickets,
          SUM(z.sold_quantity)::int AS sold_tickets
        FROM events e
        LEFT JOIN zones z ON e.event_id = z.event_id
        WHERE 1=1
      `;

      let params = [];
      let index = 1;

      if (month) {
        query += ` AND EXTRACT(MONTH FROM e.event_end) = $${index}`;
        params.push(month);
        index++;
      }

      if (year) {
        query += ` AND EXTRACT(YEAR FROM e.event_end) = $${index}`;
        params.push(year);
        index++;
      }

      query += ` GROUP BY e.event_id`;

      const { rows } = await pool.query(query, params);

      return res.status(200).json({
        success: true,
        data: rows
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Lỗi server"
      });
    }
  },
    async getAllOrders(req, res) {
        try {
            const { rows } = await pool.query(
                `
                  SELECT p.created_at, pd.total_price, p.payment_status 
                  FROM payments p 
                  JOIN payment_detail pd ON p.payment_id = pd.payment_id;
                `
            )

            return res.status(200).json({
                success: true,
                data: rows
            })
        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Lỗi server"
            });
        }
    }
};