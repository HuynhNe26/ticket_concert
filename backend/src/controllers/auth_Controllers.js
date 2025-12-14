import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";

const JWT_SECRET = process.env.JWT_SECRET;


/**
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const {
      fullName,
      birthOfDay,
      email,
      password,
      phoneNumber,
      gender
    } = req.body;

    // check email tồn tại
    const check_email = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (check_email.rows.length > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const check_phone = await pool.query(
      "SELECT user_id FROM users WHERE phonenumber = $1",
      [phoneNumber]
    );

    if (check_phone.rows.length > 0) {
      return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users 
      (fullName, birthOfDay, email, password, phoneNumber, gender, member_id, point, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [
        fullName,
        birthOfDay,
        email,
        hashPassword,
        phoneNumber,
        gender,
        1,               // hạng Đồng
        0,
        "Tài khoản mới"
      ]
    );

    res.json({ message: "Đăng ký thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Sai email hoặc mật khẩu" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai email hoặc mật khẩu" });
    }

    // update status + login_time
    await pool.query(
      `UPDATE users 
       SET status = $1, login_time = NOW()
       WHERE user_id = $2`,
      ["Đang hoạt động", user.user_id]
    );

    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        user_id: user.user_id,
        fullName: user.fullname,
        email: user.email,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * POST /api/auth/login-google
 */
export const loginGoogle = async (req, res) => {
  try {
    const { tokenId } = req.body;

    // Decode Google token (payload chứa email, name, picture...)
    const googlePayload = jwt.decode(tokenId);

    if (!googlePayload?.email) {
      return res.status(400).json({ message: "Token Google không hợp lệ" });
    }

    const { email, name: fullName } = googlePayload;

    // Check nếu user đã tồn tại
    let result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    let user;

    if (result.rows.length === 0) {
      // User chưa có -> tạo mới
      const insert = await pool.query(
        `INSERT INTO users
        (fullName, email, password, phoneNumber, gender, member_id, point, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        RETURNING *`,
        [
          fullName,
          email,
          null, // Google login không cần password
          null, // phoneNumber
          null, // gender
          1,    // member_id hạng Đồng
          0,    // point
          "Tài khoản mới"
        ]
      );
      user = insert.rows[0];
    } else {
      // User đã tồn tại
      user = result.rows[0];
    }

    // Tạo JWT cho app
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    res.json({
      message: "Đăng nhập bằng Google thành công",
      token,
      user: {
        user_id: user.user_id,
        fullName: user.fullname,
        email: user.email,
        status: user.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};