import express from "express";
import crypto from "crypto";
import { pool } from "../../../config/database.js";

const momoNotify = express.Router();

momoNotify.post("/notify", async (req, res) => {
  try {
    const data = req.body;
    console.log("MoMo IPN:", data);

    // Thanh toán thất bại → bỏ qua
    if (data.resultCode !== 0) {
      console.log("Thanh toán thất bại, resultCode:", data.resultCode);
      return res.status(200).json({ message: "Payment failed" });
    }

    const { orderId, amount, transId, extraData } = data;

    // Parse extraData
    let parsedExtra = {};
    try {
      parsedExtra = JSON.parse(
        Buffer.from(extraData || "", "base64").toString()
      );
    } catch (err) {
      console.warn("Cannot parse extraData:", extraData);
    }

    const userId = parsedExtra.userId;
    if (!userId) {
      console.error("Không có userId trong extraData");
      return res.status(200).json({ message: "ok" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Kiểm tra payment đã xử lý chưa (tránh duplicate)
      const existingPayment = await client.query(
        `SELECT payment_id FROM payments WHERE payment_ref = $1`,
        [`MOMO_${orderId}`]
      );

      if (existingPayment.rows.length > 0) {
        console.log("Payment đã xử lý rồi, bỏ qua");
        await client.query("ROLLBACK");
        return res.status(200).json({ message: "ok" });
      }

      // Lấy cart
      const { rows: carts } = await client.query(
        `SELECT * FROM cart_items
         WHERE user_id = $1 AND expires_at > NOW()
         FOR UPDATE`,
        [userId]
      );

      if (!carts.length) {
        console.error("Giỏ hàng trống hoặc hết hạn");
        await client.query("ROLLBACK");
        return res.status(200).json({ message: "ok" });
      }

      // Kiểm tra + trừ vé
      for (const item of carts) {
        const { rows } = await client.query(
          `SELECT zone_quantity, sold_quantity
           FROM zones WHERE zone_code = $1
           FOR UPDATE`,
          [item.zone_code]
        );

        const zone = rows[0];
        if (zone.sold_quantity + item.quantity > zone.zone_quantity) {
          await client.query("ROLLBACK");
          console.error(`Zone ${item.zone_code} hết vé`);
          return res.status(200).json({ message: "ok" });
        }

        await client.query(
          `UPDATE zones SET sold_quantity = sold_quantity + $1
           WHERE zone_code = $2`,
          [item.quantity, item.zone_code]
        );
      }

      // Tạo payment
      const ticket_qr = crypto.randomBytes(8).toString("hex");
      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments
         (user_id, method, payment_status, payment_ref, ticket_qr)
         VALUES ($1, 'MOMO', 'Thành công', $2, $3)
         RETURNING payment_id`,
        [userId, `MOMO_${orderId}`, ticket_qr]
      );

      const payment_id = paymentRows[0].payment_id;

      // Tạo payment_detail
      for (const item of carts) {
        await client.query(
          `INSERT INTO payment_detail
           (payment_id, event_id, ticket_quantity, zone_code)
           VALUES ($1, $2, $3, $4)`,
          [payment_id, item.event_id, item.quantity, item.zone_code]
        );
      }

      // Xoá cart
      await client.query(
        `DELETE FROM cart_items WHERE user_id = $1`,
        [userId]
      );

      await client.query("COMMIT");
      console.log(`✅ MoMo IPN thành công - payment_id: ${payment_id}`);

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Checkout error:", err);
    } finally {
      client.release();
    }

    // Luôn trả 200 cho MoMo
    res.status(200).json({ message: "ok" });

  } catch (err) {
    console.error("IPN error:", err);
    res.status(200).json({ message: "ok" });
  }
});

export default momoNotify;