import { pool } from "../../config/database.js";

export const Manage_userControllers = {
  async getAllUsers(req, res) {
    try {
      const { search } = req.query;
      
      let query = `
        SELECT 
            u.user_id, 
            u.fullname, 
            u.email, 
            u.phonenumber, 
            u.gender, 
            u.status, 
            u.created_at, 
            u.point, 
            m.membership 
        FROM users u
        LEFT JOIN members m ON u.member_id = m.member_id
      `;
      
      const params = [];
      if (search) {
        query += ` WHERE u.fullname ILIKE $1 OR u.email ILIKE $1 OR u.phonenumber ILIKE $1`;
        params.push(`%${search}%`); 
      }
      query += ` ORDER BY u.user_id DESC`; 

      const { rows } = await pool.query(query, params);
      return res.json({ success: true, data: rows });
    } catch (err) {
      console.error("Lỗi lấy danh sách người dùng:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  async getUserDetail(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT u.*, m.membership 
        FROM users u 
        LEFT JOIN members m ON u.member_id = m.member_id 
        WHERE u.user_id = $1
      `;
      const { rows } = await pool.query(query, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Người dùng không tồn tại" });
      }

      return res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error("Lỗi lấy chi tiết người dùng:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  }
};