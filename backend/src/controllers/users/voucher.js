import { pool } from "../../config/database.js";

// ─── GET /api/vouchers?order_value=xxx ────────────────────────────────────────
// Trả về danh sách voucher còn hạn, còn số lượng, đủ điều kiện đơn hàng
export const getAvailableVouchers = async (req, res) => {
  try {
    const user_id    = req.user.id;                        // từ JWT middleware
    const order_value = Number(req.query.order_value) || 0;

    // Lấy member_id của user để check tier nếu cần sau này
    const { rows: userRows } = await pool.query(
      `SELECT member_id FROM users WHERE user_id = $1`,
      [user_id]
    );
    const member_id = userRows[0]?.member_id ?? null;

    const { rows } = await pool.query(
      `SELECT
         voucher_id,
         voucher_code,
         description,
         voucher_type,
         voucher_value,
         max_reduction,
         min_order_value,
         voucher_end,
         voucher_quantity,
         voucher_used
       FROM vouchers
       WHERE voucher_status  = true
         AND voucher_start  <= NOW()
         AND voucher_end    >= NOW()
         AND voucher_used    < voucher_quantity
         AND min_order_value <= $1
       ORDER BY voucher_value DESC`,
      [order_value]
    );

    // Tính discount preview cho từng voucher để FE hiển thị luôn
    const vouchers = rows.map((v) => {
      let discount = 0;
      if (v.voucher_type) {
        // % giảm
        discount = Math.floor((order_value * v.voucher_value) / 100);
        if (v.max_reduction) discount = Math.min(discount, v.max_reduction);
      } else {
        // giảm cố định
        discount = v.voucher_value;
      }
      discount = Math.min(discount, order_value);

      return {
        ...v,
        discount_preview: discount,                        // FE dùng để hiển thị "Giảm X₫"
        is_percent: v.voucher_type,
      };
    });

    return res.json({ success: true, vouchers });
  } catch (err) {
    console.error("getAvailableVouchers error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/vouchers/validate ─────────────────────────────────────────────
export const validateVoucher = async (req, res) => {
  try {
    const { voucher_code } = req.body;
    const order_value = Number(req.body.order_value);

    if (!voucher_code || !order_value) {
      return res.status(400).json({
        success: false,
        message: "Thiếu voucher_code hoặc order_value",
      });
    }

    const { rows } = await pool.query(
      `SELECT * FROM vouchers
       WHERE voucher_code    = $1
         AND voucher_status  = true
         AND voucher_start  <= NOW()
         AND voucher_end    >= NOW()
         AND voucher_used    < voucher_quantity
         AND min_order_value <= $2`,
      [voucher_code, order_value]
    );

    if (!rows.length) {
      return res.status(200).json({
        success: false,
        message: "Mã không hợp lệ, đã hết hạn hoặc không đủ điều kiện đơn hàng",
      });
    }

    return res.status(200).json({ success: true, voucher: rows[0] });
  } catch (err) {
    console.error("validateVoucher error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};