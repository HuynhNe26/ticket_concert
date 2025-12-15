import { pool } from "../../config/database.js";
import { signToken } from "../../utils/jwt.js";

export const AdminControllers = {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Thiếu username hoặc password",
        });
      }

      const query = `
        SELECT *
        FROM admins
        WHERE email = $1 AND password = $2
        LIMIT 1;
      `;

      const { rows } = await pool.query(query, [username, password]);

      if (!rows.length) {
        return res.status(401).json({
          success: false,
          message: "Sai tài khoản hoặc mật khẩu",
        });
      }

      const admin = rows[0];

      const id = admin.admin_id;
      
      await pool.query(
        `
          UPDATE admins
          SET status = $1,
              login_time = NOW()
          WHERE admin_id = $2
        `,
        ["Đang hoạt động", id]
      );

      const token = signToken({
        admin_id: id,
        fullName: admin.fullName,
        role: admin.role,
        level: admin.level,
      });

      return res.json({
        success: true,
        token,
        admin,
      });

    } catch (err) {
      console.error("Đăng nhập thất bại:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
      });
    }
  },

  async profile(req, res) {
    try {
      const adminId = req.admin.admin_id;

      const query = `
        SELECT *
        FROM admins
        WHERE admin_id = $1
        LIMIT 1;
      `;

      const { rows } = await pool.query(query, [adminId]);

      if (!rows.length) {
        return res.status(404).json({ message: "Không tìm thấy quản trị viên!" });
      }

      return res.json({
        success: true,
        admin: rows[0],
      });

    } catch (err) {
      console.error("Lỗi:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async getAdminById(req, res) {
    try {
      const adminId = req.params.id

      const query = `
        SELECT *
        FROM admins
        WHERE admin_id = $1
      `

      const { rows } = await pool.query(query, [adminId]);

      if (!rows.length) {
        return res.status(404).json({ message: "Không tìm thấy quản trị viên!" });
      }

      return res.json({
        success: true,
        admin: rows[0],
      });

    } catch (err) {
      console.error("Lỗi lấy dữ liệu quản trị viên theo id:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async create(req, res) {
    try {
      const {
        fullName,
        birthOfDay,
        email,
        phoneNumber,
        gender,
        address,
        level,
        role
      } = req.body;

      if (!fullName || !birthOfDay || !email || !phoneNumber || !gender || !address || !level || !role) {
        return res.status(400).json({
          success: false,
          message: "Lỗi thiếu thông tin!"
        });
      }

      const query = `
        INSERT INTO admins (
          fullName,
          birthOfDay,
          email,
          password,
          phoneNumber,
          gender,
          address,
          level,
          role,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `;

      const { rows } = await pool.query(query, [
        fullName,
        birthOfDay,
        email,
        "123456",
        phoneNumber,
        gender,
        address,
        level,
        role,
        "Tài khoản mới!"
      ]);

      return res.status(201).json({
        success: true,
        message: "Tạo tài khoản thành công!",
      });

    } catch (err) {
      console.error("Lỗi tạo dữ liệu:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async getAllAdmin(req, res) {
    try {
      const { rows } = await pool.query("SELECT * FROM admins");

      return res.json({
        success: true,
        admin: rows,
      });

    } catch (err) {
      console.error("Lỗi lấy dữ liệu quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },
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