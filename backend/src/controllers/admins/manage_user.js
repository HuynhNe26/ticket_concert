import { pool } from "../../config/database.js";
import { signToken } from "../../utils/jwt.js";

export const Manage_userControllers = {
  async getAllUsers(req, res) {
    try {
      const { search } = req.query;
      
      let query = `
        SELECT u.user_id, u.fullname, u.email, u.phonenumber, u.gender, u.status, u.created_at, 
               u.point, u.member_id 
        FROM users u
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
      console.error(err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  async getAllMemberships(req, res) {
    try {
      const query = "SELECT * FROM members ORDER BY member_point ASC";
      const { rows } = await pool.query(query);
      return res.json({
        success: true,
        data: rows,
      });

    } catch (err) {
      console.error("Lỗi lấy danh sách hạng thành viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { fullName, phoneNumber, status, point, member_id } = req.body;

      await pool.query(
        `UPDATE users SET fullname = $1, phonenumber = $2, status = $3, point = $4, member_id = $5 WHERE user_id = $6`,
        [fullName, phoneNumber, status, point, member_id, id]
      );

      return res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Lỗi server khi cập nhật" });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const checkQuery = "SELECT * FROM users WHERE user_id = $1";
      const { rows } = await pool.query(checkQuery, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: "User không tồn tại" });
      }

      await pool.query("DELETE FROM users WHERE user_id = $1", [id]);

      return res.json({
        success: true,
        message: "Xóa thành công!",
      });
    } catch (err) {
      console.error("Delete user error:", err);
      // Mã lỗi 23503 là lỗi khóa ngoại trong PostgreSQL
      if (err.code === '23503') {
          return res.status(400).json({ message: "Không thể xóa user này vì họ đã có lịch sử giao dịch/thanh toán." });
      }
      return res.status(500).json({ message: "Lỗi server khi xóa" });
    }
  },
};