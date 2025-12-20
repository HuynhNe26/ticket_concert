import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "20m"; 

export const authControllers = {
  generateToken(userId) {
    return jwt.sign(
      { user_id: userId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  },

  /**
   * Helper: Format user response
   */
  formatUserResponse(user) {
    return {
      user_id: user.user_id,
      fullName: user.fullname,
      email: user.email,
      phoneNumber: user.phonenumber,
      gender: user.gender,
      birthOfDay: user.birthofday,
      member_id: user.member_id,
      point: user.point,
      status: user.status
    };
  },

  /**
   * POST /api/users/register
   * Đăng ký tài khoản mới
   */
  async register(req, res) {
    try {
      const {
        fullName,
        birthOfDay,
        email,
        password,
        phoneNumber,
        gender
      } = req.body;

      // Check email đã tồn tại
      const checkEmail = await pool.query(
        "SELECT user_id FROM users WHERE email = $1",
        [email]
      );

      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ message: "Email đã được sử dụng" });
      }

      // Check số điện thoại đã tồn tại
      const checkPhone = await pool.query(
        "SELECT user_id FROM users WHERE phonenumber = $1",
        [phoneNumber]
      );

      if (checkPhone.rows.length > 0) {
        return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Tạo user mới
      await pool.query(
        `INSERT INTO users 
        (fullName, birthOfDay, email, password, phoneNumber, gender, member_id, point, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [
          fullName,
          birthOfDay,
          email,
          hashedPassword,
          phoneNumber,
          gender,
          1,  // member_id: Hạng Đồng
          0,  // point: 0
          "Tài khoản mới"
        ]
      );

      return res.status(201).json({ 
        success: true,
        message: "Đăng ký thành công" 
      });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /**
   * POST /api/users/login
   * Đăng nhập bằng email/password
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Tìm user
      const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          message: "Email hoặc mật khẩu không đúng" 
        });
      }

      const user = result.rows[0];

      // Kiểm tra password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: "Email hoặc mật khẩu không đúng" 
        });
      }

      // Cập nhật trạng thái và thời gian đăng nhập
      await pool.query(
        `UPDATE users 
         SET status = $1, login_time = NOW()
         WHERE user_id = $2`,
        ["Đang hoạt động", user.user_id]
      );

      // Tạo token
      const token = authControllers.generateToken(user.user_id);

      return res.json({
        success: true,
        message: "Đăng nhập thành công",
        token,
        user: authControllers.formatUserResponse(user)
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /**
   * POST /api/users/login-google
   * Đăng nhập bằng Google OAuth
   */
  async loginGoogle(req, res) {
    try {
      const { tokenId } = req.body;

      // Decode Google token
      const googlePayload = jwt.decode(tokenId);

      if (!googlePayload?.email) {
        return res.status(400).json({ 
          message: "Token Google không hợp lệ" 
        });
      }

      const { email, name: fullName, picture } = googlePayload;

      // Kiểm tra user đã tồn tại chưa
      let result = await pool.query(
        "SELECT * FROM users WHERE email = $1", 
        [email]
      );

      let user;

      if (result.rows.length === 0) {
        // Tạo user mới cho Google login
        const insertResult = await pool.query(
          `INSERT INTO users
          (fullName, email, password, phoneNumber, gender, member_id, point, status, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
          RETURNING *`,
          [
            fullName,
            email,
            "",  // Google login không cần password
            "",  // phoneNumber để trống
            "",  // gender để trống
            1,   // member_id: Hạng Đồng
            0,   // point: 0
            "Tài khoản mới"
          ]
        );
        user = insertResult.rows[0];
      } else {
        // User đã tồn tại
        user = result.rows[0];
        
        // Cập nhật trạng thái đăng nhập
        await pool.query(
          `UPDATE users 
           SET status = $1, login_time = NOW()
           WHERE user_id = $2`,
          ["Đang hoạt động", user.user_id]
        );
      }

      // Tạo token
      const token = authControllers.generateToken(user.user_id);

      return res.json({
        success: true,
        message: "Đăng nhập Google thành công",
        token,
        user: authControllers.formatUserResponse(user)
      });
    } catch (err) {
      console.error("Google login error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /**
   * POST /api/users/logout
   * Đăng xuất (cập nhật status)
   */
  async logout(req, res) {
    try {
      const userId = req.user.user_id; // Từ middleware verifyToken

      await pool.query(
        `UPDATE users 
         SET status = $1
         WHERE user_id = $2`,
        ["Đã đăng xuất", userId]
      );

      return res.json({ 
        success: true,
        message: "Đăng xuất thành công" 
      });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /**
   * GET /api/users/profile
   * Lấy thông tin profile của user đang đăng nhập
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.user_id; // Từ middleware verifyToken

      const result = await pool.query(
        "SELECT * FROM users WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          message: "Không tìm thấy user" 
        });
      }

      return res.json({
        success: true,
        user: authControllers.formatUserResponse(result.rows[0])
      });
    } catch (err) {
      console.error("Get profile error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  }
};