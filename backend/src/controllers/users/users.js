import { pool } from "../../config/database.js";

export const UserController = {
  async getAll(req, res) {
    try {
      const { rows } = await pool.query("SELECT * FROM users ORDER BY user_id ASC");
      return res.json({ success: true, data: rows });
    } catch (err) {
      console.error("Lỗi lấy users:", err);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  },

  async create(req, res) {
    try {
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: "Thiếu name hoặc email!"
        });
      }

      const query = `
        INSERT INTO users (name, email)
        VALUES ($1, $2)
        RETURNING *;
      `;

      const values = [name, email];

      const { rows } = await pool.query(query, values);

      return res.json({
        success: true,
        message: "Tạo user thành công!",
        data: rows[0]
      });

    } catch (err) {
      console.error("Lỗi tạo user:", err);
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
  },

  async getUserById(req, res) {
    
  }
};
