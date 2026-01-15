import { pool } from "../../config/database.js";

export const CategoriesControllers = {

  async getAllCategories(req, res) {
    try {
      const { rows } = await pool.query("SELECT * FROM categories");

      if (rows.length === 0) {
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

  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu id thể loại!"
        });
      }

      const query = `SELECT * FROM categories WHERE category_id = $1`;
      const { rows } = await pool.query(query, [id]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy thể loại với id=${id}`
        });
      }

      return res.status(200).json({
        success: true,
        data: rows[0]
      });
    } catch (err) {
      console.error("Lỗi lấy thể loại theo id:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async createCategory(req, res) {
    try {
      const { category_name } = req.body;

      if (!category_name) {
        return res.status(400).json({
          success: false,
          message: "Thiếu tên thể loại!"
        });
      }

      const query = `
        INSERT INTO categories (category_name, created_at)
        VALUES ($1, NOW())
        RETURNING *
      `;

      const { rows } = await pool.query(query, [category_name]);

      return res.status(201).json({
        success: true,
        message: "Tạo thể loại thành công!",
        data: rows[0]
      });
    } catch (err) {
      console.error("Lỗi tạo thể loại:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu id thể loại!"
        });
      }

      const query = `
        DELETE FROM categories
        WHERE category_id = $1
        RETURNING *
      `;

      const { rows } = await pool.query(query, [id]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy thể loại với id=${id}`
        });
      }

      return res.status(200).json({
        success: true,
        message: "Xóa thể loại thành công!",
        data: rows[0]
      });
    } catch (err) {
      console.error("Lỗi xóa thể loại:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  }
};
