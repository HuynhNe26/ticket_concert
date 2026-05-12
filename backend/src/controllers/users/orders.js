import { pool } from "../../config/database.js";

export const OrderControllers = {
  async getOldOrderById(req, res) {
    try {
      const userId = req.user.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Người dùng chưa đăng nhập!"
        })
      };

      const query = `
        SELECT DISTINCT ON (e.event_id)
          e.event_id,
          e.event_name,
          e.banner_url,
          e.event_end,
          p.created_at,
          (SELECT MIN(zone_price) FROM zones WHERE event_id = e.event_id) as min_price
        FROM payments p
        JOIN payment_detail pd ON pd.payment_id = p.payment_id
        JOIN events e ON e.event_id = pd.event_id
        WHERE p.user_id = $1
        ORDER BY e.event_id, p.created_at DESC
        LIMIT 10;
      `;

      const { rows } = await pool.query(query, [userId]);

      res.status(200).json({
        data: rows,
        success: true,
        message: "Lấy dữ liệu thành công!"
      })
    } catch (error) {
      console.error("Lỗi lấy layout:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
        error: error.message
      });
    }
  }
};
