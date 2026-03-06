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

    // 🔒 1. Lock zone row trước (quan trọng)
    const zoneResult = await client.query(
      `
      SELECT zone_quantity, sold_quantity
      FROM zones
      WHERE zone_code = $1
      FOR UPDATE
      `,
      [zone_code]
    );

    if (!zoneResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Zone không tồn tại" });
    }

    const { zone_quantity, sold_quantity } = zoneResult.rows[0];

    // 📊 2. Tính reserved riêng (không cần GROUP BY nữa)
    const reservedResult = await client.query(
      `
      SELECT COALESCE(SUM(quantity), 0) AS reserved_quantity
      FROM cart_items
      WHERE zone_code = $1
        AND expires_at > NOW()
      `,
      [zone_code]
    );

    const reserved_quantity = parseInt(reservedResult.rows[0].reserved_quantity);

    const available = zone_quantity - sold_quantity - reserved_quantity;

    if (quantity > available) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Không đủ vé" });
    }

    const existingResult = await client.query(
      `
      SELECT quantity
      FROM cart_items
      WHERE user_id = $1
        AND zone_code = $2
        AND expires_at > NOW()
      `,
      [userId, zone_code]
    );

    const currentQty = existingResult.rows[0]?.quantity || 0;

    if (currentQty + quantity > 5) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Tối đa 5 vé / khu" });
    }

    if (existingResult.rows.length) {
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

export async function getCart(req, res) {
  const { userId } = req.user;

  try {
    const query = `
      SELECT * FROM cart_items 
      WHERE user_id = $1
      AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: "Lỗi server" 
    });
  }
}