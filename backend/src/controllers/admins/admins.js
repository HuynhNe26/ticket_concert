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

      const token = signToken({
        admin_id: admin.admin_id,
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
      console.error("Login admin error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
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
        return res.status(404).json({ message: "Admin not found" });
      }

      return res.json({
        success: true,
        admin: rows[0],
      });

    } catch (err) {
      console.error("Profile admin error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
};
