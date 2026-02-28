import { pool } from "../../config/database.js";

export async function addToCart(req, res) {
  const { userId } = req.user;
  const { eventId, zone_code, quantity } = req.body;

  if (quantity < 1 || quantity > 5) {
    return res.status(400).json({ message: "Chỉ được mua 1–5 vé" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT z.zone_quantity,
             z.sold_quantity,
             COALESCE(SUM(c.quantity), 0) AS reserved_quantity
      FROM zones z
      LEFT JOIN cart_items c
        ON c.zone_code = z.zone_code
       AND c.expires_at > NOW()
      WHERE z.zone_code = $1
      GROUP BY z.zone_quantity, z.sold_quantity
      FOR UPDATE
      `,
      [zone_code]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Zone không tồn tại" });
    }

    const { zone_quantity, sold_quantity, reserved_quantity } = rows[0];
    const available = zone_quantity - sold_quantity - reserved_quantity;

    if (quantity > available) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Không đủ vé" });
    }

    const { rows: existing } = await client.query(
      `
      SELECT quantity
      FROM cart_items
      WHERE user_id = $1
        AND zone_code = $2
        AND expires_at > NOW()
      `,
      [userId, zone_code]
    );

    const currentQty = existing[0]?.quantity || 0;

    if (currentQty + quantity > 5) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Tối đa 5 vé / khu" });
    }

    if (existing.length) {
      await client.query(
        `
        UPDATE cart_items
        SET quantity = quantity + $1,
            expires_at = NOW() + INTERVAL '20 minutes'
        WHERE user_id = $2 AND zone_code = $3
        `,
        [quantity, userId, zone_code]
      );
    } else {
      await client.query(
        `
        INSERT INTO cart_items (user_id, event_id, zone_code, quantity, expires_at)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '20 minutes')
        `,
        [userId, eventId, zone_code, quantity]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Đã giữ vé 20 phút",
      available_after: available - quantity
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  } finally {
    client.release();
  }
}