import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database.js";
import { Resend } from "resend";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "1h"; 


const resend = new Resend(process.env.RESEND_API_KEY);

export const authControllers = {
  generateToken(userId) {
    return jwt.sign(
      { user_id: userId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  },

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

      const checkEmail = await pool.query(
        "SELECT user_id FROM users WHERE email = $1",
        [email]
      );

      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ message: "Email đã được sử dụng" });
      }

      const checkPhone = await pool.query(
        "SELECT user_id FROM users WHERE phonenumber = $1",
        [phoneNumber]
      );

      if (checkPhone.rows.length > 0) {
        return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

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
          1,  
          0,  
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

  async login(req, res) {
    try {
      const { email, password } = req.body;

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

      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: "Email hoặc mật khẩu không đúng" 
        });
      }

      await pool.query(
        `UPDATE users 
         SET status = $1, login_time = NOW()
         WHERE user_id = $2`,
        ["Đang hoạt động", user.user_id]
      );

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

  async loginGoogle(req, res) {
    try {
      const { tokenId } = req.body;

      const googlePayload = jwt.decode(tokenId);

      if (!googlePayload?.email) {
        return res.status(400).json({ 
          message: "Token Google không hợp lệ" 
        });
      }

      const { email, name: fullName } = googlePayload;

      let result = await pool.query(
        "SELECT * FROM users WHERE email = $1", 
        [email]
      );

      let user;

      if (result.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO users
          (fullName, email, password, phoneNumber, gender, member_id, point, status, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
          RETURNING *`,
          [
            fullName,
            email,
            "",  
            "",  
            "",  
            1,   
            0,   
            "Tài khoản mới"
          ]
        );
        user = insertResult.rows[0];
      } else {
        user = result.rows[0];
        
        await pool.query(
          `UPDATE users 
           SET status = $1, login_time = NOW()
           WHERE user_id = $2`,
          ["Đang hoạt động", user.user_id]
        );
      }

      const token = authControllers.generateToken(user.user_id);

      const needUpdateProfile =
        !user.phonenumber ||
        !user.gender ||
        !user.birthofday;

      return res.json({
        success: true,
        message: "Đăng nhập Google thành công",
        token,
        user: authControllers.formatUserResponse(user),
        needUpdateProfile
      });
    } catch (err) {
      console.error("Google login error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

    async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Thiếu token" });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user_id;

      await pool.query(
        `UPDATE users
        SET logout_time = NOW()
        WHERE user_id = $1`,
        [userId]
      );

      return res.json({
        success: true,
        message: "Đã cập nhật logout_time",
      });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },


  async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const { rows } = await pool.query(
        "SELECT * FROM users WHERE user_id = $1",
        [userId]
      );

      return res.status(200).json({
        success: true,
        data: rows
      });
    } catch (err) {
      console.error("Get profile error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  async updateProfile(req, res) {

    const userId = req.user.userId;

    const {
      phoneNumber,
      gender,
      birthOfDay
    } = req.body;
  
    await pool.query(
      `UPDATE users
      SET phonenumber=$1,
          gender=$2,
          birthofday=$3
      WHERE user_id=$4`,
      [phoneNumber, gender, birthOfDay, userId]
    );

    res.json({ success: true });
  },

  async changeProfile(req, res) {

    const userId = req.user.userId;

    const {
      fullname,
      phonenumber,
      gender,
      birthofday
    } = req.body;
  
    await pool.query(
      `UPDATE users
      SET fullname=$1,
          phonenumber=$2,
          gender=$3,
          birthofday=$4
      WHERE user_id=$5`,
      [fullname, phonenumber, gender, birthofday, userId]
    );

    res.json({ success: true, message: "Thay đổi thông tin thành công!" });
  },

  async sendotp(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Lỗi không có email!"
        });
      }

      const userResult = await pool.query(
        `
        SELECT email
        FROM users
        WHERE email = $1
        `,
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Email không tồn tại!"
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await bcrypt.hash(otp, 10);

      await pool.query(
        `
        UPDATE users
        SET code = $1,
            expired_code = NOW() + INTERVAL '10 minutes'
        WHERE email = $2
        `,
        [hash, email]
      );

      await resend.emails.send({
        from: "noreply@ticketconcert.online",
        to: email,
        subject: `Ticket Concert - ${otp} là mã xác nhận để đặt lại mật khẩu của bạn`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Ticket Concert</h2>

            <p style="font-size: 15px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản của bạn.</p>

            <p style="font-size: 17px;"><strong>Đây là mã xác nhận để đặt lại mật khẩu:</strong></p>

            <div style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 6px;
              margin: 20px 0;
              color: #2e7d32;
            ">
              ${otp}
            </div>

            <p style="font-size: 15px;">Mã xác nhận sẽ hết hạn trong <strong style="color: #2e7d32;">10 phút</strong>.</p>

            <p style="font-size: 15px;">Nếu bạn không yêu cầu thay đổi mật khẩu, hãy bỏ qua email này.</p>

            <br />
            <p style="font-size: 17px;"><strong>Ticket Concert Team</strong></p>
            <br />
            <div style="display: flex; gap: 10px; align-items: center;">
              <img 
                src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776499227/xmcn7vabeqm6lgnvl0pm.png"
                style="width: 150px; height: 150px; object-fit: contain; display: block; margin-right: 50px;"
              />

              <img 
                src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776498643/yuzokosxfjqor1g0twvm.jpg"
                style="width: 150px; height: 150px; object-fit: contain; display: block;"
              />
            </div>
          </div>
        `
      });

      return res.status(200).json({
        success: true,
        message: "Đã gửi mã OTP qua email!"
      });
    } catch (err) {
      console.log(err);

      return res.status(500).json({
        success: false,
        message: "Lỗi server!"
      });
    }
  },

  async verifyopt(req, res) {
    try {
      const {otp, email} = req.body;

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mã otp!"
        });
      }

      const result = await pool.query(
        `
        SELECT code, expired_code
        FROM users
        WHERE email = $1
          AND expired_code >= NOW()
        `,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "OTP không tồn tại hoặc đã hết hạn"
        });
      }

      const user = result.rows[0];

      const isMatch = await bcrypt.compare(otp, user.code);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "OTP không đúng"
        });
      }

      return res.status(200).json({
        success: true,
        data: user
      })
    } catch (err) {
      console.log(err);

      return res.status(500).json({
        success: false,
        message: "Lỗi server!"
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const {password, email} = req.body;

      const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu!"
        });
      }

      const hashPassword = await bcrypt.hash(password, 10);

      await pool.query(
        `
        UPDATE users
        SET password = $1
        WHERE email = $2
        `,
        [hashPassword, email]
      );

      const {rows} = await pool.query(
        `SELECT fullname
        FROM users
        WHERE email = $1`
      , [email])

      const fullname = rows[0]?.fullname;

      await resend.emails.send({
        from: "noreply@ticketconcert.online",
        to: email,
        subject: `Ticket Concert Notification - Mật khẩu của bạn đã được thay đổi`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="font-size: 17px;">Ticket Concert</h2>

            <p style="font-size: 15px;">Chào <strong>${fullname}</strong></p>

            <p style="font-size: 15px;">Mật khẩu của bạn đã được thay đổi và lúc <strong>${now}</strong>. Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng liên hệ với quản trị viên của mình.</p>
            <br />
            <p style="font-size: 15px;">ticketconcert-cskh@gmail.com</p>

            <br />
            <p style="font-size: 17px;"><strong>Ticket Concert Team</strong></p>
            <br />
            <div style="display: flex; gap: 10px; align-items: center;">
              <img 
                src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776499227/xmcn7vabeqm6lgnvl0pm.png"
                style="width: 150px; height: 150px; object-fit: contain; display: block; margin-right: 50px;"
              />

              <img 
                src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776498643/yuzokosxfjqor1g0twvm.jpg"
                style="width: 150px; height: 150px; object-fit: contain; display: block;"
              />
            </div>
          </div>
        `
      });

      return res.status(200).json({
        success: true,
        message: "Thay đổi mật khẩu thành công!"
      })
    } catch (err) {
      console.log(err);

      return res.status(500).json({
        success: false,
        message: "Lỗi server!"
      });
    }
  }
};