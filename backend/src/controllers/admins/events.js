import { pool } from "../../config/database.js";

export const EventControllers = {
  async getAllEvent(req, res) {
    try {
      const query = "SELECT * FROM events"

      const { rows } = await pool.query(query);

      if (!rows.length) {
        return res.status(404).json({ message: "Không có sự kiện nào!" });
      }

      return res.json({
        success: true,
        data: rows,
      });

    } catch (err) {
      console.error("Lỗi lấy dữ liệu sự kiện:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },
};