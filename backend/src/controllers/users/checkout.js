import { pool } from "../../config/database.js";

export async function checkout(req, res) {
  const { userId } = req.user;
  const { method = 'CASH' } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lấy cart
    const { rows: carts } = await client.query(
      `SELECT * FROM cart_items
       WHERE user_id = $1 AND expires_at > NOW()
       FOR UPDATE`,
      [userId]
    );

    if (!carts.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Giỏ hàng trống hoặc hết hạn" });
    }

    // Kiểm tra + trừ vé
    for (const item of carts) {
      const { rows } = await client.query(
        `SELECT zone_quantity, sold_quantity
         FROM zones
         WHERE zone_code = $1
         FOR UPDATE`,
        [item.zone_code]
      );

      const zone = rows[0];
      if (zone.sold_quantity + item.quantity > zone.zone_quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Zone ${item.zone_code} đã hết vé`
        });
      }

      await client.query(
        `UPDATE zones
         SET sold_quantity = sold_quantity + $1
         WHERE zone_code = $2`,
        [item.quantity, item.zone_code]
      );
    }

    // Tạo payment_ref và ticket_qr unique
    const payment_ref = `${method}_${Date.now()}_${userId}`;
    const ticket_qr = `QR_${userId}_${Date.now()}`;

    // Insert payment
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments 
       (user_id, method, payment_status, payment_ref, ticket_qr)
       VALUES ($1, $2, 'Thành công', $3, $4)
       RETURNING payment_id`,
      [userId, method, payment_ref, ticket_qr]
    );

    const payment_id = paymentRows[0].payment_id;

    // Insert payment_detail cho từng item
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

    res.json({
      success: true,
      message: "Thanh toán thành công",
      payment_id,
      ticket_qr
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Checkout error:", err);
    res.status(500).json({ message: "Thanh toán thất bại" });
  } finally {
    client.release();
  }
}