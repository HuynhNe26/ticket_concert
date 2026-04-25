import { pool } from "../../config/database.js";

export const CategoryControllers = {
  async getCategories(req, res) {
    try {
      const { rows } = await pool.query("SELECT category_id, category_name FROM categories");

      return res.status(200).json({
        success: true, 
        message: "Lấy thể loại thành công!", 
        data: rows
      });
    }
    catch (error) {
      console.error("Lỗi lấy thể loại:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
        error: error.message
      });
    }
  },
async getAllCategories(req, res) {
    try {
      // Lưu ý: Nếu dùng MySQL thì dùng pool.execute, nếu dùng PostgreSQL thì dùng pool.query
      const { rows } = await pool.query("SELECT * FROM categories");

      if (!rows || rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Không có dữ liệu thể loại!"
        });
      }

      return res.status(200).json({
        success: true,
        data: rows
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách thể loại:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },
};
