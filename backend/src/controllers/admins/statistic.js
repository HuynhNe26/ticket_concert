import { pool } from "../../config/database.js";

export const StatisticControllers = {
async getCalendarEvents(req, res) {
    try {
      const { month, year } = req.query;
      let query = `
        SELECT 
          e.event_id,
          e.event_name, 
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
        // Sử dụng JOIN giữa payments (p) và payment_detail (pd)
        // Dùng SUM(pd.ticket_quantity) để lấy tổng số vé của mỗi hóa đơn
        const { rows } = await pool.query(
            `
            SELECT 
                p.payment_id,
                p.created_at, 
                p.payment_status,
                -- Tính tổng doanh thu từ chi tiết thanh toán
                SUM(pd.total_price) as total_price,
                -- Tính tổng số lượng vé dựa trên cột ticket_quantity trong schema của bạn
                SUM(pd.ticket_quantity) as total_tickets
            FROM payments p 
            JOIN payment_detail pd ON p.payment_id = pd.payment_id
            WHERE p.payment_status = 'Thành công'
            GROUP BY p.payment_id, p.created_at, p.payment_status
            ORDER BY p.created_at DESC;
            `
        );

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error("Lỗi thống kê:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
}
};