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
};