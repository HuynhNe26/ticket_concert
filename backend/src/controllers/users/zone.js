import { pool } from "../../config/database.js";

export const ZoneControllers = {

  async getAllZone(req, res) {
    try {
      const { rows } = await pool.query("SELECT * FROM zones");

      return res.json({
        success: true,
        zones: rows,
      });

    } catch (err) {
      console.error("Lỗi lấy dữ liệu quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  }
};