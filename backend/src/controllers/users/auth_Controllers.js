import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database.js";
import { Resend } from "resend";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "15m";
const CLIENT_URL = "https://www.ticketconcert.online";

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
      status: user.status,
      is_verified: user.is_verified
    };
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

  async register(req, res) {
    try {
      const { fullName, birthOfDay, email, password, phoneNumber, gender } = req.body;

      // Kiểm tra email trùng
      const checkEmail = await pool.query(
        "SELECT user_id FROM users WHERE email = $1",
        [email]
      );
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ message: "Email đã được sử dụng" });
      }

      // Kiểm tra SĐT trùng
      const checkPhone = await pool.query(
        "SELECT user_id FROM users WHERE phonenumber = $1",
        [phoneNumber]
      );
      if (checkPhone.rows.length > 0) {
        return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const verificationToken = crypto.randomBytes(32).toString("hex");

      await pool.query(
        `INSERT INTO users
          (fullname, birthofday, email, password, phonenumber, gender,
           member_id, point, status,
           is_verified, verification_token, verified_at,
           created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW() + INTERVAL '5 minutes',NOW())`,
        [
          fullName,
          birthOfDay,
          email,
          hashedPassword,
          phoneNumber,
          gender,
          1,
          0,
          "Tài khoản mới",
          false,
          verificationToken
        ]
      );

      const verifyLink = `${CLIENT_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

      await resend.emails.send({
        from: "no-reply@ticketconcert.online",
        to: email,
        subject: "Ticket Concert – Xác thực tài khoản của bạn",
        html: `
          <div style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
              <tr>
                <td align="center">
                  <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

                    <!-- Header -->
                    <tr>
                      <td style="background:#7c3aed;padding:24px;text-align:center;">
                        <h1 style="margin:0;font-size:24px;color:#ffffff;letter-spacing:1px;">
                          Ticket Concert
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding:36px 32px;">
                        <h2 style="margin:0 0 16px;font-size:22px;color:#111827;">
                          Xác thực tài khoản
                        </h2>

                        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4b5563;">
                          Xin chào <strong style="color:#111827;">${fullName}</strong>,
                        </p>

                        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                          Cảm ơn bạn đã đăng ký tài khoản tại Ticket Concert.  
                          Vui lòng nhấn vào nút bên dưới để xác thực email của bạn.
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                          <tr>
                            <td align="center">
                              <a href="${verifyLink}"
                                style="display:inline-block;background:#7c3aed;color:#ffffff;
                                        text-decoration:none;font-size:15px;font-weight:bold;
                                        padding:14px 32px;border-radius:8px;">
                                Xác thực tài khoản
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6b7280;">
                          Liên kết xác thực sẽ hết hạn sau <strong>5 phút</strong>.
                        </p>

                        <p style="margin:0;font-size:14px;line-height:1.6;color:#ef4444;">
                          Nếu bạn không tạo tài khoản này, hãy bỏ qua email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                          Ticket Concert Team<br/>
                          ticketconcert.online
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      return res.status(201).json({
        success: true,
        message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản (hiệu lực 5 phút)."
      });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  async verifyEmail(req, res) {
    try {
      const { token, email } = req.query;

      if (!token || !email) {
        return res.status(400).json({
          success: false,
          message: "Liên kết xác thực không hợp lệ!"
        });
      }

      const result = await pool.query(
        `SELECT user_id, fullname, is_verified, verification_token, verified_at
         FROM users
         WHERE email = $1
           AND verification_token = $2`,
        [email, token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Liên kết xác thực không hợp lệ!"
        });
      }

      const user = result.rows[0];

      if (user.is_verified) {
        return res.status(400).json({
          success: false,
          message: "Tài khoản đã được xác thực trước đó!"
        });
      }

      const now = new Date();
      const expiry = new Date(user.verified_at);
      if (now > expiry) {
        return res.status(400).json({
          success: false,
          message: "Liên kết xác thực đã hết hạn! Vui lòng đăng ký lại."
        });
      }

      await pool.query(
        `UPDATE users
         SET is_verified = TRUE,
             verification_token = NULL,
             verified_at = NOW()
         WHERE user_id = $1`,
        [user.user_id]
      );

      await resend.emails.send({
        from: "no-reply@ticketconcert.online",
        to: email,
        subject: "Ticket Concert – Xác thực tài khoản thành công! 🎉",
        html: `
          <div style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
              <tr>
                <td align="center">
                  <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

                    <!-- Header -->
                    <tr>
                      <td style="background:#7c3aed;padding:24px;text-align:center;">
                        <h1 style="margin:0;font-size:24px;color:#ffffff;letter-spacing:1px;">
                          Ticket Concert
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding:36px 32px;text-align:center;">

                        <h2 style="margin:0 0 16px;font-size:24px;color:#111827;">
                          Xác thực thành công
                        </h2>

                        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4b5563;text-align:left;">
                          Xin chào <strong style="color:#111827;">${user.fullname}</strong>,
                        </p>

                        <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#4b5563;text-align:left;">
                          Tài khoản của bạn đã được xác thực thành công.  
                          Bạn có thể đăng nhập và bắt đầu khám phá các sự kiện âm nhạc ngay bây giờ.
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                          <tr>
                            <td align="center">
                              <a href="${CLIENT_URL}/login"
                                style="display:inline-block;background:#7c3aed;color:#ffffff;
                                        text-decoration:none;font-size:15px;font-weight:bold;
                                        padding:14px 32px;border-radius:8px;">
                                Đăng nhập ngay
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                          Ticket Concert Team<br/>
                          ticketconcert.online
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      return res.status(200).json({
        success: true,
        message: "Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay."
      });
    } catch (err) {
      console.error("Verify email error:", err);
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
        return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
      }

      const user = result.rows[0];

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
      }

      if (!user.is_verified) {
        const verificationToken = crypto.randomBytes(32).toString("hex");

        await pool.query(
          `UPDATE users
           SET verification_token = $1,
               verified_at        = NOW() + INTERVAL '5 minutes'
           WHERE user_id = $2`,
          [verificationToken, user.user_id]
        );

        const verifyLink = `${CLIENT_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

        await resend.emails.send({
          from: "no-reply@ticketconcert.online",
          to: email,
          subject: "Ticket Concert – Xác thực tài khoản của bạn",
          html: `
            <div style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
                <tr>
                  <td align="center">
                    <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

                      <!-- Header -->
                      <tr>
                        <td style="background:#7c3aed;padding:24px;text-align:center;">
                          <h1 style="margin:0;font-size:24px;color:#ffffff;letter-spacing:1px;">
                            Ticket Concert
                          </h1>
                        </td>
                      </tr>

                      <!-- Content -->
                      <tr>
                        <td style="padding:36px 32px;">
                          <h2 style="margin:0 0 16px;font-size:22px;color:#111827;">
                            Gửi lại liên kết xác thực
                          </h2>

                          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4b5563;">
                            Xin chào <strong style="color:#111827;">${user.fullname}</strong>,
                          </p>

                          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                            Chúng tôi đã gửi lại liên kết xác thực tài khoản theo yêu cầu của bạn.
                            Vui lòng nhấn vào nút bên dưới để tiếp tục xác thực email.
                          </p>

                          <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                            <tr>
                              <td align="center">
                                <a href="${verifyLink}"
                                  style="display:inline-block;background:#7c3aed;color:#ffffff;
                                          text-decoration:none;font-size:15px;font-weight:bold;
                                          padding:14px 32px;border-radius:8px;">
                                  Xác thực tài khoản
                                </a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6b7280;">
                            Liên kết sẽ hết hạn sau <strong>5 phút</strong>.
                          </p>

                          <p style="margin:0;font-size:14px;line-height:1.6;color:#ef4444;">
                            Nếu bạn không yêu cầu email này, hãy bỏ qua.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                            Ticket Concert Team<br/>
                            ticketconcert.online
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </div>
          `
        });

        return res.status(403).json({
          success: false,
          unverified: true, 
          email,
          message: "Tài khoản chưa được xác thực. Chúng tôi đã gửi lại email xác thực, vui lòng kiểm tra hộp thư!"
        });
      }

      await pool.query(
        `UPDATE users SET status = $1, login_time = NOW() WHERE user_id = $2`,
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

  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Thiếu token" });

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      await pool.query(
        `UPDATE users SET logout_time = NOW() WHERE user_id = $1`,
        [decoded.user_id]
      );

      return res.json({ success: true, message: "Đã cập nhật logout_time" });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  async getProfile(req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE user_id = $1",
        [req.user.userId]
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error("Get profile error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  async updateProfile(req, res) {
    const { phoneNumber, gender, birthOfDay } = req.body;
    await pool.query(
      `UPDATE users SET phonenumber=$1, gender=$2, birthofday=$3 WHERE user_id=$4`,
      [phoneNumber, gender, birthOfDay, req.user.userId]
    );
    res.json({ success: true });
  },

  async changeProfile(req, res) {
    const { fullname, phonenumber, gender, birthofday } = req.body;
    await pool.query(
      `UPDATE users SET fullname=$1, phonenumber=$2, gender=$3, birthofday=$4 WHERE user_id=$5`,
      [fullname, phonenumber, gender, birthofday, req.user.userId]
    );
    res.json({ success: true, message: "Thay đổi thông tin thành công!" });
  },

  async sendotp(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: "Lỗi không có email!" });

      const userResult = await pool.query(
        `SELECT email FROM users WHERE email = $1`,
        [email]
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Email không tồn tại!" });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await bcrypt.hash(otp, 10);

      await pool.query(
        `UPDATE users SET code = $1, expired_code = NOW() + INTERVAL '10 minutes' WHERE email = $2`,
        [hash, email]
      );

      await resend.emails.send({
        from: "no-reply@ticketconcert.online",
        to: email,
        subject: `Ticket Concert - ${otp} là mã xác nhận để đặt lại mật khẩu của bạn`,
        html: `
          <div style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#060a14;padding:40px 16px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                    <tr>
                      <td style="padding-bottom:24px;text-align:center;">
                        <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                          <tr>
                            <td style="background:#7c3aed;border-radius:10px;padding:8px 20px;">
                              <span style="font-family:'Bebas Neue','Arial Black',Arial,sans-serif;font-size:22px;letter-spacing:4px;color:#ffffff;">TICKET CONCERT</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#0d1526;border-radius:20px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:32px 36px;">
                              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
                                Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Sử dụng mã xác nhận dưới đây:
                              </p>
                              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                  <td align="center" style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.35);border-radius:14px;padding:28px 20px;">
                                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:5px;color:#7c3aed;text-transform:uppercase;">Mã xác nhận</p>
                                    <p style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:48px;font-weight:700;letter-spacing:12px;color:#c4b5fd;">${otp}</p>
                                    <p style="margin:0;font-size:12px;color:#64748b;">Hết hạn sau <strong style="color:#f87171;">10 phút</strong></p>
                                  </td>
                                </tr>
                              </table>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:14px 16px;">
                                    <p style="margin:0;font-size:13px;color:#fca5a5;line-height:1.6;">
                                      ⚠️ Nếu bạn không yêu cầu thay đổi mật khẩu, hãy bỏ qua email này.
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr><td style="border-top:1px dashed rgba(255,255,255,0.08);"></td></tr>
                        </table>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:24px 36px;">
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td>
                                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:2px;color:#c4b5fd;text-transform:uppercase;">Ticket Concert Team</p>
                                    <p style="margin:0;font-size:12px;color:#475569;">ticketconcert.online</p>
                                  </td>
                                  <td align="right">
                                    <table cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="padding-right:12px;">
                                          <img src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776499227/xmcn7vabeqm6lgnvl0pm.png" width="50" height="50" style="display:block;border-radius:8px;" alt="Logo 1"/>
                                        </td>
                                        <td>
                                          <img src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776498643/yuzokosxfjqor1g0twvm.jpg" width="50" height="50" style="display:block;border-radius:8px;" alt="Logo 2"/>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 0 0;text-align:center;">
                        <p style="margin:0;font-size:11px;color:#334155;line-height:1.6;">
                          Email này được gửi tự động từ hệ thống Ticket Concert.<br/>Vui lòng không trả lời email này.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      return res.status(200).json({ success: true, message: "Đã gửi mã OTP qua email!" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "Lỗi server!" });
    }
  },

  async verifyopt(req, res) {
    try {
      const { otp, email } = req.body;
      if (!otp) return res.status(400).json({ success: false, message: "Vui lòng nhập mã otp!" });

      const result = await pool.query(
        `SELECT code, expired_code FROM users WHERE email = $1 AND expired_code >= NOW()`,
        [email]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ success: false, message: "OTP không tồn tại hoặc đã hết hạn" });
      }

      const isMatch = await bcrypt.compare(otp, result.rows[0].code);
      if (!isMatch) return res.status(400).json({ success: false, message: "OTP không đúng" });

      return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "Lỗi server!" });
    }
  },

  async resetPassword(req, res) {
    try {
      const { password, email } = req.body;
      if (!password) return res.status(400).json({ success: false, message: "Vui lòng nhập mật khẩu!" });

      const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const hashPassword = await bcrypt.hash(password, 10);

      await pool.query(`UPDATE users SET password = $1 WHERE email = $2`, [hashPassword, email]);

      const { rows } = await pool.query(`SELECT fullname FROM users WHERE email = $1`, [email]);
      const fullname = rows[0]?.fullname;

      await resend.emails.send({
        from: "noreply@ticketconcert.online",
        to: email,
        subject: "Ticket Concert Notification - Mật khẩu của bạn đã được thay đổi",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="font-size: 17px;">Ticket Concert</h2>
            <p style="font-size: 15px;">Chào <strong>${fullname}</strong></p>
            <p style="font-size: 15px;">Mật khẩu của bạn đã được thay đổi lúc <strong>${now}</strong>. Nếu bạn không yêu cầu thay đổi, vui lòng liên hệ quản trị viên.</p>
            <br/>
            <p style="font-size: 15px;">ticketconcert-cskh@gmail.com</p>
            <br/>
            <p style="font-size: 17px;"><strong>Ticket Concert Team</strong></p>
          </div>
        `
      });

      return res.status(200).json({ success: true, message: "Thay đổi mật khẩu thành công!" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "Lỗi server!" });
    }
  }
};