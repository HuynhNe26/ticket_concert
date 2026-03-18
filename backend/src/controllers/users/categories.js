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
};
