import express from "express";
import crypto from "crypto";
import { pool } from "../../../config/database.js";

const momoNotify = express.Router();

momoNotify.post("/notify", async (req, res) => {
  try {
    const data = req.body;
    console.log("MoMo IPN:", data);

    // ❌ fail thì bỏ
    if (data.resultCode !== 0) {
      return res.status(200).json({ message: "Payment failed" });
    }

    const { orderId, extraData } = data;

    // 🔥 parse extraData
    let parsedExtra = {};
    try {
      parsedExtra = JSON.parse(
        Buffer.from(extraData || "", "base64").toString()
      );
    } catch (err) {
      console.warn("Parse extraData fail");
    }

    const userId = parsedExtra.userId;
    const price = parsedExtra.price;
    const total_price = parsedExtra.total_price;
    if (!userId) {
      console.error("Không có userId");
      return res.status(200).json({ message: "ok" });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 🔒 chống IPN duplicate
      const existing = await client.query(
        `SELECT payment_id FROM payments WHERE payment_ref = $1`,
        [`MOMO_${orderId}`]
      );

      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        console.log("Duplicate IPN → bỏ");
        return res.status(200).json({ message: "ok" });
      }

      // 🛒 lock cart
      const { rows: carts } = await client.query(
        `SELECT * FROM cart_items
         WHERE user_id = $1 AND expires_at > NOW()
         FOR UPDATE`,
        [userId]
      );

      if (!carts.length) {
        await client.query("ROLLBACK");
        console.log("Cart trống");
        return res.status(200).json({ message: "ok" });
      }

      // 🔥 xử lý từng item
      for (const item of carts) {

        // 🔒 lock zone
        const { rows } = await client.query(
          `SELECT zone_quantity, sold_quantity, zone_code
           FROM zones
           WHERE zone_id = $1
           FOR UPDATE`,
          [item.zone_id]
        );

        const zone = rows[0];

        if (!zone) {
          throw new Error("Zone not found");
        }

        // ❌ hết vé
        if (zone.sold_quantity + item.quantity > zone.zone_quantity) {
          await client.query("ROLLBACK");
          console.log("Hết vé zone:", item.zone_id);
          return res.status(200).json({ message: "Sold out" });
        }

        // ✅ update số vé
        await client.query(
          `UPDATE zones
           SET sold_quantity = sold_quantity + $1
           WHERE zone_id = $2`,
          [item.quantity, item.zone_id]
        );

        // 🔥 lưu lại zone_code để insert detail
        item._zone_code = zone.zone_code;
      }

      // 💳 tạo payment
      const ticket_qr = crypto.randomBytes(8).toString("hex");

      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments
         (user_id, method, payment_status, payment_ref, ticket_qr)
         VALUES ($1, 'MOMO', 'Thành công', $2, $3)
         RETURNING payment_id`,
        [userId, `MOMO_${orderId}`, ticket_qr]
      );

      const payment_id = paymentRows[0].payment_id;

      // 🧾 insert detail
      for (const item of carts) {
        await client.query(
          `INSERT INTO payment_detail
           (payment_id, event_id, ticket_quantity, zone_id, price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            payment_id,
            item.event_id,
            item.quantity,
            item.zone_id,
            price,
            total_price 
          ]
        );
      }

      // 🧹 xoá cart
      await client.query(
        `DELETE FROM cart_items WHERE user_id = $1`,
        [userId]
      );

      await client.query("COMMIT");

      console.log("✅ Payment thành công:", payment_id);

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Checkout error:", err);
    } finally {
      client.release();
    }

    return res.status(200).json({ message: "ok" });

  } catch (err) {
    console.error("IPN error:", err);
    return res.status(200).json({ message: "ok" });
  }
});

export default momoNotify;