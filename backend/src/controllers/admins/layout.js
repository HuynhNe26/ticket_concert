import { pool } from "../../config/database.js";

export const LayoutControllers = {
  // ============ LẤY LAYOUT VÀ ZONES THEO EVENT_ID ============
  async getLayoutByEventId(req, res) {
    try {
      const { eventId } = req.params;

      // Lấy thông tin layout
      const layoutQuery = `
        SELECT * FROM layout 
        WHERE event_id = $1
      `;

      const layoutResult = await pool.query(layoutQuery, [eventId]);

      if (layoutResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy layout cho sự kiện này'
        });
      }

      // Lấy danh sách zones
      const zonesQuery = `
        SELECT 
          zone_id,
          event_id,
          zone_code,
          zone_name,
          zone_description,
          zone_quantity,
          sold_quantity,
          (zone_quantity - sold_quantity) as available_quantity,
          zone_price,
          status
        FROM zones 
        WHERE event_id = $1 
        ORDER BY zone_code
      `;

      const zonesResult = await pool.query(zonesQuery, [eventId]);

      return res.status(200).json({
        success: true,
        data: {
          layout: layoutResult.rows[0],
          zones: zonesResult.rows
        },
        message: 'Lấy layout thành công'
      });

    } catch (err) {
      console.error('❌ Lỗi lấy layout:', err);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy layout',
        error: err.message
      });
    }
  },

  // ============ LẤY TẤT CẢ LAYOUTS ============
  async getAllLayouts(req, res) {
    try {
      const query = `
        SELECT 
          l.layout_id,
          l.event_id,
          l.layout_json,
          e.event_name,
          e.event_location,
          e.event_start,
          e.event_status,
          COUNT(z.zone_id) as total_zones
        FROM layout l
        JOIN events e ON l.event_id = e.event_id
        LEFT JOIN zones z ON l.event_id = z.event_id
        GROUP BY l.layout_id, l.event_id, l.layout_json, e.event_name, e.event_location, e.event_start, e.event_status
        ORDER BY l.layout_id DESC
      `;

      const result = await pool.query(query);

      return res.status(200).json({
        success: true,
        data: result.rows,
        message: result.rows.length 
          ? 'Lấy danh sách layouts thành công' 
          : 'Chưa có layout nào'
      });

    } catch (err) {
      console.error('❌ Lỗi lấy danh sách layouts:', err);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách layouts',
        error: err.message
      });
    }
  },

  // ============ LẤY ZONES THEO EVENT_ID ============
  async getZonesByEventId(req, res) {
    try {
      const { eventId } = req.params;

      const query = `
        SELECT 
          zone_id,
          event_id,
          zone_code,
          zone_name,
          zone_description,
          zone_quantity,
          sold_quantity,
          (zone_quantity - sold_quantity) as available_quantity,
          zone_price,
          status,
          CASE 
            WHEN (zone_quantity - sold_quantity) = 0 THEN 'Hết vé'
            WHEN (zone_quantity - sold_quantity) < zone_quantity * 0.2 THEN 'Sắp hết'
            ELSE 'Còn vé'
          END as availability_status
        FROM zones 
        WHERE event_id = $1 
        ORDER BY zone_code
      `;

      const result = await pool.query(query, [eventId]);

      return res.status(200).json({
        success: true,
        data: result.rows,
        message: result.rows.length 
          ? 'Lấy danh sách zones thành công' 
          : 'Chưa có zone nào cho sự kiện này'
      });

    } catch (err) {
      console.error('❌ Lỗi lấy zones:', err);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy zones',
        error: err.message
      });
    }
  },

  // ============ TẠO LAYOUT MỚI CHO EVENT ============
  async createLayout(req, res) {
    const client = await pool.connect();
    
    try {
      const { eventId } = req.params;
      const { layout } = req.body;

      // Validation
      if (!layout || !layout.zones) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin layout hoặc zones'
        });
      }

      if (layout.zones.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Layout phải có ít nhất 1 zone'
        });
      }

      await client.query('BEGIN');

      // Kiểm tra event có tồn tại không
      const eventCheck = await client.query(
        'SELECT event_id, event_name FROM events WHERE event_id = $1',
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sự kiện'
        });
      }

      // Kiểm tra event đã có layout chưa
      const layoutCheck = await client.query(
        'SELECT layout_id FROM layout WHERE event_id = $1',
        [eventId]
      );

      if (layoutCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Sự kiện này đã có layout. Vui lòng cập nhật layout thay vì tạo mới.'
        });
      }

      // Thêm layout vào database
      const layoutInsertQuery = `
        INSERT INTO layout (layout_json, event_id) 
        VALUES ($1, $2) 
        RETURNING *
      `;

      const layoutResult = await client.query(layoutInsertQuery, [
        JSON.stringify(layout),
        eventId
      ]);

      // Thêm zones vào database (lọc bỏ zones không hợp lệ)
      const validZones = layout.zones.filter(zone => 
        zone.price && 
        zone.total_quantity && 
        zone.status !== false
      );

      const zoneInsertPromises = validZones.map(zone => {
        const zoneInsertQuery = `
          INSERT INTO zones (
            event_id,
            zone_code,
            zone_name,
            zone_description,
            zone_quantity,
            sold_quantity,
            zone_price,
            status
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING zone_id, zone_code, zone_name
        `;

        return client.query(zoneInsertQuery, [
          eventId,
          zone.id,
          zone.name,
          zone.description || `${zone.type} zone`,
          zone.total_quantity,
          0, // sold_quantity ban đầu = 0
          zone.price,
          true
        ]);
      });

      const zonesResult = await Promise.all(zoneInsertPromises);

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: `Tạo layout cho sự kiện "${eventCheck.rows[0].event_name}" thành công!`,
        data: {
          layout: layoutResult.rows[0],
          zones_created: zonesResult.length,
          zones: zonesResult.map(r => r.rows[0])
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Lỗi tạo layout:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo layout',
        error: err.message
      });
    } finally {
      client.release();
    }
  },

  // ============ CẬP NHẬT LAYOUT ============
  async updateLayout(req, res) {
    const client = await pool.connect();
    
    try {
      const { eventId } = req.params;
      const { layout } = req.body;

      // Validation
      if (!layout || !layout.zones) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin layout hoặc zones'
        });
      }

      await client.query('BEGIN');

      // Kiểm tra layout có tồn tại không
      const layoutCheck = await client.query(
        'SELECT layout_id FROM layout WHERE event_id = $1',
        [eventId]
      );

      if (layoutCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy layout cho sự kiện này'
        });
      }

      // Cập nhật layout
      const layoutUpdateQuery = `
        UPDATE layout 
        SET layout_json = $1 
        WHERE event_id = $2 
        RETURNING *
      `;

      const layoutResult = await client.query(layoutUpdateQuery, [
        JSON.stringify(layout),
        eventId
      ]);

      // Xóa zones cũ (chỉ xóa zones chưa bán)
      await client.query(
        'DELETE FROM zones WHERE event_id = $1 AND sold_quantity = 0',
        [eventId]
      );

      // Thêm zones mới
      const validZones = layout.zones.filter(zone => 
        zone.price && 
        zone.total_quantity && 
        zone.status !== false
      );

      const zoneInsertPromises = validZones.map(zone => {
        const zoneInsertQuery = `
          INSERT INTO zones (
            event_id, zone_code, zone_name, zone_description,
            zone_quantity, sold_quantity, zone_price, status
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (zone_code, event_id) 
          DO UPDATE SET
            zone_name = EXCLUDED.zone_name,
            zone_description = EXCLUDED.zone_description,
            zone_quantity = EXCLUDED.zone_quantity,
            zone_price = EXCLUDED.zone_price,
            status = EXCLUDED.status
          RETURNING zone_id, zone_code, zone_name
        `;

        return client.query(zoneInsertQuery, [
          eventId,
          zone.id,
          zone.name,
          zone.description || `${zone.type} zone`,
          zone.total_quantity,
          0,
          zone.price,
          true
        ]);
      });

      const zonesResult = await Promise.all(zoneInsertPromises);

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật layout thành công!',
        data: {
          layout: layoutResult.rows[0],
          zones_updated: zonesResult.length
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Lỗi cập nhật layout:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật layout',
        error: err.message
      });
    } finally {
      client.release();
    }
  },

  // ============ XÓA LAYOUT ============
  async deleteLayout(req, res) {
    const client = await pool.connect();
    
    try {
      const { eventId } = req.params;

      await client.query('BEGIN');

      // Kiểm tra có vé đã bán chưa
      const soldTicketsCheck = await client.query(
        'SELECT SUM(sold_quantity) as total_sold FROM zones WHERE event_id = $1',
        [eventId]
      );

      if (soldTicketsCheck.rows[0].total_sold > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa layout vì đã có vé được bán'
        });
      }

      // Xóa zones trước
      await client.query('DELETE FROM zones WHERE event_id = $1', [eventId]);
      
      // Xóa layout
      const result = await client.query(
        'DELETE FROM layout WHERE event_id = $1 RETURNING layout_id',
        [eventId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy layout'
        });
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: 'Xóa layout thành công'
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Lỗi xóa layout:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa layout',
        error: err.message
      });
    } finally {
      client.release();
    }
  }
};