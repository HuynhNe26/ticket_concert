import { pool } from "../../config/database.js";
import { signToken } from "../../utils/jwt.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const AdminControllers = {
  // ── ĐĂNG NHẬP QUẢN TRỊ VIÊN VỚI BCRYPT ──
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Thiếu tên đăng nhập hoặc mật khẩu!",
        });
      }

      const cleanEmail = username.trim().toLowerCase();

      // 1. Tìm tài khoản admin theo email (case-insensitive)
      const query = `
        SELECT *
        FROM admins
        WHERE LOWER(email) = $1
        LIMIT 1;
      `;

      const { rows } = await pool.query(query, [cleanEmail]);

      if (!rows.length) {
        return res.status(401).json({
          success: false,
          message: "Tài khoản hoặc mật khẩu không chính xác!",
        });
      }

      const admin = rows[0];

      // Kiểm tra trạng thái khóa tài khoản
      if (admin.status === "Bị khóa" || admin.status === "Đã khóa") {
        return res.status(403).json({
          success: false,
          message: "Tài khoản quản trị viên này đã bị khóa!",
        });
      }

      // 2. Kiểm tra mật khẩu bằng bcrypt (có cơ chế tự động nâng cấp nếu còn plaintext)
      let isMatch = false;
      const storedPassword = admin.password || "";

      if (
        storedPassword.startsWith("$2a$") ||
        storedPassword.startsWith("$2b$") ||
        storedPassword.startsWith("$2y$")
      ) {
        isMatch = await bcrypt.compare(password, storedPassword);
      } else {
        // Tương thích ngược: Mật khẩu cũ dạng plain text (như 123456)
        isMatch = storedPassword === password;
        if (isMatch) {
          // Tự động nâng cấp hash sang bcrypt ngay lập tức trong DB!
          try {
            const upgradedHash = await bcrypt.hash(password, SALT_ROUNDS);
            await pool.query(
              "UPDATE admins SET password = $1, updated_at = NOW() WHERE admin_id = $2",
              [upgradedHash, admin.admin_id]
            );
            console.log(`[Admin Security] Đã tự động nâng cấp mật khẩu bcrypt cho admin: ${admin.email}`);
          } catch (migrateErr) {
            console.error("[Admin Security] Lỗi tự động nâng cấp hash:", migrateErr);
          }
        }
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Tài khoản hoặc mật khẩu không chính xác!",
        });
      }

      const id = admin.admin_id;

      // Cập nhật trạng thái và thời gian đăng nhập
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
        fullName: admin.fullname || admin.fullName,
        role: admin.role,
        level: admin.level,
      });

      // Bảo mật: Loại bỏ trường password trước khi trả về client
      const { password: _, ...safeAdmin } = admin;

      return res.json({
        success: true,
        token,
        admin: safeAdmin,
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
        SELECT admin_id, fullname, birthofday, email, phonenumber, gender, address, level, role, created_at, updated_at, status, login_time, logout_time
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
      console.error("Lỗi lấy thông tin profile admin:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async getAdminById(req, res) {
    try {
      const adminId = req.params.id;

      const query = `
        SELECT admin_id, fullname, birthofday, email, phonenumber, gender, address, level, role, created_at, updated_at, status, login_time, logout_time
        FROM admins
        WHERE admin_id = $1
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
      console.error("Lỗi lấy dữ liệu quản trị viên theo id:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  // ── TẠO MỚI QUẢN TRỊ VIÊN VỚI MẬT KHẨU BCRYPT ──
  async create(req, res) {
    try {
      const {
        fullName,
        birthOfDay,
        email,
        password,
        phoneNumber,
        gender,
        address,
        level,
        role
      } = req.body;

      if (!fullName || !birthOfDay || !email || !phoneNumber || !gender || !address || !level || !role) {
        return res.status(400).json({
          success: false,
          message: "Lỗi: Vui lòng điền đầy đủ các thông tin bắt buộc!",
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Kiểm tra trùng email
      const checkEmail = await pool.query(
        "SELECT admin_id FROM admins WHERE LOWER(email) = $1 LIMIT 1",
        [cleanEmail]
      );
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email này đã được sử dụng bởi quản trị viên khác!",
        });
      }

      // Xử lý mật khẩu: Sử dụng mật khẩu được nhập hoặc tạo mật khẩu mặc định an toàn
      const rawPassword = (password && String(password).trim().length >= 6)
        ? String(password).trim()
        : "Admin@123456";

      // Hash mật khẩu với bcrypt
      const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

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
        RETURNING admin_id, fullName, email, role, level
      `;

      const { rows } = await pool.query(query, [
        fullName.trim(),
        birthOfDay,
        cleanEmail,
        hashedPassword,
        phoneNumber.trim(),
        gender,
        address.trim(),
        level,
        role,
        "Tài khoản mới!"
      ]);

      return res.status(201).json({
        success: true,
        message: "Tạo tài khoản quản trị viên thành công!",
        admin: rows[0],
        defaultPasswordUsed: !password || String(password).trim().length < 6,
      });

    } catch (err) {
      console.error("Lỗi tạo dữ liệu quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async getAllAdmin(req, res) {
    try {
      const query = `
        SELECT admin_id, fullname, birthofday, email, phonenumber, gender, address, level, role, created_at, updated_at, status, login_time, logout_time
        FROM admins
        ORDER BY admin_id ASC
      `;
      const { rows } = await pool.query(query);

      return res.json({
        success: true,
        admin: rows,
      });

    } catch (err) {
      console.error("Lỗi lấy danh sách quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async searchAdmin(req, res) {
    try {
      const adminKeyword = req.query.admin || "";

      const query = `
        SELECT admin_id, fullname, birthofday, email, phonenumber, gender, address, level, role, created_at, updated_at, status, login_time, logout_time
        FROM admins
        WHERE email ILIKE '%' || $1 || '%' OR fullname ILIKE '%' || $1 || '%'
        ORDER BY admin_id ASC
      `;

      const { rows } = await pool.query(query, [adminKeyword]);

      if (rows.length === 0) {
        return res.json({
          success: false,
          message: "Không có dữ liệu cần tìm!",
          admin: [],
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

  // ── ĐẶT LẠI MẬT KHẨU VỚI BCRYPT ──
  async resetPass(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Lỗi: Không tìm thấy ID quản trị viên!",
        });
      }

      const { rows } = await pool.query(
        `SELECT fullName FROM admins WHERE admin_id = $1`,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy quản trị viên!",
        });
      }

      const fullName = rows[0]?.fullname || rows[0]?.fullName || "Quản trị viên";

      // Nhận mật khẩu mới nếu có gửi từ client, nếu không dùng mật khẩu mặc định "Admin@123456"
      const rawPassword = req.body?.newPassword || req.body?.password || "Admin@123456";
      const hashedPassword = await bcrypt.hash(String(rawPassword), SALT_ROUNDS);

      const query = `
        UPDATE admins 
        SET password = $1,
            updated_at = NOW()
        WHERE admin_id = $2
      `;

      const result = await pool.query(query, [hashedPassword, id]);

      if (result.rowCount > 0) {
        return res.status(200).json({
          success: true,
          message: `Đặt lại mật khẩu cho quản trị viên ${fullName} thành công! Mật khẩu mới: ${rawPassword}`,
        });
      }

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quản trị viên!",
      });

    } catch (err) {
      console.error("Lỗi đặt lại mật khẩu quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  // ── ĐỔI MẬT KHẨU QUẢN TRỊ VIÊN ──
  async changePassword(req, res) {
    try {
      const adminId = req.admin?.admin_id;
      const { currentPassword, newPassword } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: "Chưa xác thực quản trị viên!" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới!",
        });
      }

      if (String(newPassword).length < 6) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự!",
        });
      }

      const { rows } = await pool.query("SELECT password FROM admins WHERE admin_id = $1", [adminId]);
      if (!rows.length) {
        return res.status(404).json({ success: false, message: "Không tìm thấy quản trị viên!" });
      }

      const stored = rows[0].password || "";
      let isMatch = false;

      if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
        isMatch = await bcrypt.compare(currentPassword, stored);
      } else {
        isMatch = stored === currentPassword;
      }

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu hiện tại không chính xác!",
        });
      }

      const newHashed = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
      await pool.query(
        "UPDATE admins SET password = $1, updated_at = NOW() WHERE admin_id = $2",
        [newHashed, adminId]
      );

      return res.json({
        success: true,
        message: "Đổi mật khẩu thành công!",
      });

    } catch (err) {
      console.error("Lỗi đổi mật khẩu:", err);
      return res.status(500).json({ success: false, message: "Lỗi server!" });
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

      const query = `
        UPDATE admins 
        SET fullname = $1,
            birthofday = $2,
            phonenumber = $3,
            address = $4,
            updated_at = NOW()
        WHERE admin_id = $5
      `;

      await pool.query(query, [fullname, birthofday, phonenumber, address, adminId]);

      return res.status(200).json({
        success: true,
        message: "Thay đổi thông tin thành công!",
      });

    } catch (err) {
      console.error("Lỗi thay đổi thông tin quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  },

  async updateAdmin(req, res) {
    try {
      const { fullname, email, phonenumber, birthofday, gender, role, level, address, password } = req.body;
      const { id } = req.params;

      // Nếu có truyền mật khẩu mới để cập nhật
      if (password && String(password).trim().length >= 6) {
        const hashedPassword = await bcrypt.hash(String(password).trim(), SALT_ROUNDS);
        const query = `
          UPDATE admins 
          SET fullname = $1,
              birthofday = $2,
              phonenumber = $3,
              address = $4,
              email = $5,
              gender = $6,
              role = $7,
              level = $8,
              password = $9,
              updated_at = NOW()
          WHERE admin_id = $10
        `;
        await pool.query(query, [fullname, birthofday, phonenumber, address, email, gender, role, level, hashedPassword, id]);
      } else {
        const query = `
          UPDATE admins 
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
        `;
        await pool.query(query, [fullname, birthofday, phonenumber, address, email, gender, role, level, id]);
      }

      return res.status(200).json({
        success: true,
        message: "Thay đổi thông tin quản trị viên thành công!",
      });

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
      `;

      await pool.query(query, [id]);

      return res.status(200).json({
        success: true,
        message: "Xóa dữ liệu quản trị viên thành công!",
      });
    } catch (err) {
      console.error("Lỗi xóa quản trị viên:", err);
      return res.status(500).json({ message: "Lỗi server!" });
    }
  }
};