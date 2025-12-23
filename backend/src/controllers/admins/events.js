import { pool } from "../../config/database.js";

export const EventControllers = {
  async getAllEvent(req, res) {
    try {
      const query = `
        SELECT *
        FROM events
        ORDER BY created_at DESC
      `;

      const { rows } = await pool.query(query);

      return res.status(200).json({
        success: true,
        data: rows,
        message: rows.length
          ? "Lấy danh sách sự kiện thành công"
          : "Chưa có sự kiện nào",
      });

    } catch (err) {
      console.error("Lỗi lấy dữ liệu sự kiện:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
      });
    }
  },
};
