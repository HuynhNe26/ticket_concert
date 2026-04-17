import { pool } from "../../config/database.js";

export async function addToCart(req, res) {
  const { userId } = req.user;
  const { eventId, zone_id, quantity } = req.body;

  if (quantity < 1 || quantity > 5) {
    return res.status(400).json({ message: "Chỉ được mua 1–5 vé" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🔍 1. Kiểm tra user đã có cart chưa (chưa hết hạn)
    const checkCart = `
      SELECT 1
      FROM cart_items
      WHERE user_id = $1
      AND expires_at > NOW()
      LIMIT 1
    `;

    const cartResult = await client.query(checkCart, [userId]);

    if (cartResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Người dùng đang có đơn hàng khác trong giỏ hàng"
      });
    }

    // 🔒 2. Lock zone
    const zoneResult = await client.query(
      `
      SELECT zone_quantity, sold_quantity
      FROM zones
      WHERE zone_id = $1
      AND event_id = $2
      FOR UPDATE
      `,
      [zone_id, eventId]
    );

    if (!zoneResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Zone không tồn tại" });
    }

    const { zone_quantity, sold_quantity } = zoneResult.rows[0];

    // 📊 3. Tính số vé đang giữ
    const reservedResult = await client.query(
      `
      SELECT COALESCE(SUM(quantity),0) AS reserved_quantity
      FROM cart_items
      WHERE zone_id = $1
      AND event_id = $2
      AND expires_at > NOW()
      `,
      [zone_id, eventId]
    );

    const reserved_quantity = parseInt(reservedResult.rows[0].reserved_quantity);

    const available = zone_quantity - sold_quantity - reserved_quantity;

    if (quantity > available) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Không đủ vé",
        available
      });
    }

    // 🔍 4. Check cart hiện tại của user trong zone
    const existingResult = await client.query(
      `
      SELECT quantity
      FROM cart_items
      WHERE user_id = $1
      AND zone_id = $2
      AND event_id = $3
      AND expires_at > NOW()
      `,
      [userId, zone_id, eventId]
    );

    const currentQty = existingResult.rows[0]?.quantity || 0;

    if (currentQty + quantity > 5) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Tối đa 5 vé / khu"
      });
    }

    // ✏️ 5. Update hoặc Insert cart
    if (existingResult.rows.length) {
      await client.query(
        `
        UPDATE cart_items
        SET quantity = quantity + $1,
            expires_at = NOW() + INTERVAL '20 minutes'
        WHERE user_id = $2
        AND zone_id = $3
        AND event_id = $4
        AND expires_at > NOW()
        `,
        [quantity, userId, zone_id, eventId]
      );
    } else {
      await client.query(
        `
        INSERT INTO cart_items
        (user_id, event_id, zone_id, quantity, expires_at)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '20 minutes')
        `,
        [userId, eventId, zone_id, quantity]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Đã giữ vé trong 20 phút",
      available_after: available - quantity
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    return res.status(500).json({
      message: "Lỗi server"
    });

  } finally {
    client.release();
  }
}

export async function getCart(req, res) {
  const { userId } = req.user;

  try {
    const query = `
      SELECT 
        c.*,

        e.event_name,
        e.event_location,
        e.event_age,
        e.event_actor,
        e.event_artist,

        z.zone_name,
        z.zone_description,
        z.zone_price,

        u.fullName,
        u.birthOfDay,
        u.email,
        u.phoneNumber,
        u.gender

      FROM cart_items c
      JOIN events e ON c.event_id = e.event_id
      JOIN zones z ON c.zone_id = z.zone_id
      JOIN users u ON c.user_id = u.user_id
      WHERE c.user_id = $1
      AND c.expires_at > NOW()
      ORDER BY c.expires_at DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(200).json({
        success: false,
        message: "Không có giỏ hàng"
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: "Lỗi server" 
    });
  }
}

export async function deleteCart(req, res) {
  const { userId } = req.user;

  try {
    const result = await pool.query(
      `DELETE FROM cart_items 
       WHERE user_id = $1 AND expires_at > NOW()
       RETURNING *`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({
        success: false,
        message: "Không có đơn hàng nào để xóa",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã xóa đơn hàng",
    });

  } catch (err) {
    console.error("deleteCart error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
}