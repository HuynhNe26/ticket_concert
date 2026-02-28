import { pool } from "../db/pool.js";

export async function checkout(req, res) {
  const { userId } = req.user;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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

      // TRỪ VÉ
      await client.query(
        `UPDATE zones
         SET sold_quantity = sold_quantity + $1
         WHERE zone_code = $2`,
        [item.quantity, item.zone_code]
      );
    }

    // xóa cart
    await client.query(
      `DELETE FROM cart_items WHERE user_id = $1`,
      [userId]
    );

    await client.query("COMMIT");

    res.json({ message: "Thanh toán thành công" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Thanh toán thất bại" });
  } finally {
    client.release();
  }
}