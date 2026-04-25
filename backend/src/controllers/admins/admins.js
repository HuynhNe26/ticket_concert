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

  async searchAdmin(req, res) {
    try {
      const admin = req.query.admin;

      const { rows } = await pool.query("SELECT * FROM admins WHERE email ILIKE '%' || $1 || '%' OR fullname ILIKE '%' || $1 || '%'", [admin]);

      if(rows.length == 0) {
        return res.json({
          success: false,
          message: "Không có dữ liệu cần tìm!"
        });
      }
      return res.json({
        success: true,
        admin: rows,
      });

    } catch (err) {
      console.error("Lỗi tìm kiếm quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async resetPass(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(403).json({
          success: false,
          message: "Lỗi không có id quản trị viên!"
        });
      }

      const { rows } = await pool.query(
        `SELECT fullName FROM admins WHERE admin_id = $1`,
        [id]
      );

      let fullName = rows[0]?.fullname;

      const password = 123456

      const query = `
        UPDATE admins 
        SET password = $1
        WHERE admin_id = $2
      `;

      const result = await pool.query(query, [password, id]);

      if (result.rowCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Thay đổi mật khẩu của quản trị viên ${fullName} thành công!`
        });
      }
      

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quản trị viên"
      });

    } catch (err) {
      console.error("Lỗi reset dữ liệu:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },
  
  async updateProfile(req, res) {
    try {
      const adminId = req.admin.admin_id;

      const {
        fullname,
        birthofday,
        phonenumber,
        address
      } = req.body;

      let query = `
        UPDATE 
          admins 
        SET fullname = $1,
        birthofday = $2,
        phonenumber = $3,
        address = $4,
        updated_at = NOW()
        WHERE admin_id = $5
      `

      const value = [
        fullname, birthofday, phonenumber, address, adminId
      ]

      await pool.query(query, value)

      res.status(200).json({
        success: true,
        message: "Thay đổi thông tin thành công!"
      })

    } catch (err) {
      console.error("Lỗi thay đổi thông tin quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async updateAdmin(req, res) {
    try {
      const {fullname, email, phonenumber, birthofday, gender, role, level, address} = req.body;
      const {id}= req.params;

      let query = `
        UPDATE 
          admins 
        SET fullname = $1,
        birthofday = $2,
        phonenumber = $3,
        address = $4,
        email = $5,
        gender = $6,
        role = $7,
        level = $8,
        updated_at = NOW()
        WHERE admin_id = $9
      `

      await pool.query(query, [fullname, birthofday, phonenumber, address, email, gender, role, level, id])

      res.status(200).json({
        success: true,
        message: "Thay đổi thông tin quản trị viên thành công!"
      })

    } catch (err) {
      console.error("Lỗi thay đổi thông tin quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async deleteAdmin(req, res) {
    try {
      const { id } = req.params;

      const query = `
        DELETE FROM admins
        WHERE admin_id = $1
      `

      await pool.query(query, [id])

      res.status(200).json({
        success: true,
        message: "Xóa dữ liệu quản trị viên thành công!"
      })
    } catch (err) {
      console.error("Lỗi xóa quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  }
};