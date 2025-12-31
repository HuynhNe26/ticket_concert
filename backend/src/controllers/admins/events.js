import { pool } from "../../config/database.js";

export const EventControllers = {
  // ============ LẤY DANH SÁCH SỰ KIỆN (CÓ SẴN) ============
  async getAllEvent(req, res) {
    try {
      const query = `
        SELECT *
        FROM events
        ORDER BY created_at DESC
      `;

      const { rows } = await pool.query(query);

      return res.status(200).json({
        success: true,
        data: rows,
        message: rows.length
          ? "Lấy danh sách sự kiện thành công"
          : "Chưa có sự kiện nào",
      });

    } catch (err) {
      console.error("Lỗi lấy dữ liệu sự kiện:", err);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
      });
    }
  },

  // ============ TẠO SỰ KIỆN MỚI (THÊM MỚI) ============
  async createEvent(req, res) {
    const client = await pool.connect();
    
    try {
      const { event, layout } = req.body;

      // Validation cơ bản
      if (!event || !layout) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin event hoặc layout"
        });
      }

      // Kiểm tra các trường bắt buộc
      const requiredFields = ['name', 'date', 'address', 'age', 'description'];
      for (const field of requiredFields) {
        if (!event[field]) {
          return res.status(400).json({
            success: false,
            message: `Thiếu trường bắt buộc: ${field}`
          });
        }
      }

      // Kiểm tra phải có ít nhất 1 zone
      if (!layout.zones || layout.zones.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Layout phải có ít nhất 1 zone"
        });
      }

      await client.query('BEGIN');

      // 1. Tạo thời gian event_start và event_end
      const eventStart = event.time 
        ? `${event.date} ${event.time}:00`
        : `${event.date} 00:00:00`;
      
      const eventEnd = event.endDate && event.endTime
        ? `${event.endDate} ${event.endTime}:00`
        : event.endDate 
          ? `${event.endDate} 23:59:59`
          : null;

      // 2. Tạo layout_code tự động
      const layoutCode = generateLayoutCode(event.name);

      // 3. Insert vào bảng events
      const eventInsertQuery = `
        INSERT INTO events (
          event_name,
          event_description,
          event_location,
          event_age,
          banner_url,
          event_layout,
          event_start,
          event_end,
          event_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING event_id, event_name, created_at
      `;

      const eventResult = await client.query(eventInsertQuery, [
        event.name,
        event.description,
        event.address,
        parseInt(event.age),
        event.image || 'https://via.placeholder.com/800x400',
        layoutCode,
        eventStart,
        eventEnd,
        false // mặc định là chưa active
      ]);

      const newEventId = eventResult.rows[0].event_id;

      // 4. Insert vào bảng layout
      const layoutInsertQuery = `
        INSERT INTO layout (layout_json, event_id)
        VALUES ($1, $2)
        RETURNING layout_id
      `;

      const layoutResult = await client.query(layoutInsertQuery, [
        JSON.stringify(layout),
        newEventId
      ]);

      const newLayoutId = layoutResult.rows[0].layout_id;

      // 5. Insert vào bảng zones (chỉ những zone có status = true)
      const zoneInsertPromises = layout.zones
        .filter(zone => zone.status !== false) // Lọc bỏ STAGE, FOH, etc.
        .map(zone => {
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
            newEventId,
            zone.id,
            zone.name,
            zone.description || `${zone.type} zone`,
            zone.total_quantity || 0,
            0, // sold_quantity ban đầu = 0
            zone.price || 0,
            zone.status !== false
          ]);
        });

      const zonesResult = await Promise.all(zoneInsertPromises);

      await client.query('COMMIT');

      // Trả về response thành công
      return res.status(201).json({
        success: true,
        message: 'Tạo sự kiện thành công',
        data: {
          event: eventResult.rows[0],
          layout: {
            layout_id: newLayoutId,
            zones_created: zonesResult.length
          },
          zones: zonesResult.map(r => r.rows[0])
        }
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Lỗi tạo sự kiện:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo sự kiện',
        error: err.message
      });
    } finally {
      client.release();
    }
  },

  // ============ LẤY CHI TIẾT 1 SỰ KIỆN (BỔ SUNG) ============
  async getEventById(req, res) {
    try {
      const { id } = req.params;

      // Lấy thông tin event và layout
      const eventQuery = `
        SELECT 
          e.*,
          l.layout_id,
          l.layout_json
        FROM events e
        LEFT JOIN layout l ON e.event_id = l.event_id
        WHERE e.event_id = $1
      `;

      const eventResult = await pool.query(eventQuery, [id]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sự kiện'
        });
      }

      // Lấy danh sách zones
      const zonesQuery = `
        SELECT * FROM zones
        WHERE event_id = $1
        ORDER BY zone_code
      `;

      const zonesResult = await pool.query(zonesQuery, [id]);

      return res.status(200).json({
        success: true,
        data: {
          event: eventResult.rows[0],
          zones: zonesResult.rows
        },
        message: 'Lấy thông tin sự kiện thành công'
      });

    } catch (err) {
      console.error('Lỗi lấy chi tiết sự kiện:', err);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server!'
      });
    }
  },

  // ============ CẬP NHẬT SỰ KIỆN (BỔ SUNG) ============
  async updateEvent(req, res) {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const { event, layout } = req.body;

      await client.query('BEGIN');

      // Update thông tin event
      if (event) {
        const eventStart = event.time 
          ? `${event.date} ${event.time}:00`
          : `${event.date} 00:00:00`;
        
        const eventEnd = event.endDate && event.endTime
          ? `${event.endDate} ${event.endTime}:00`
          : event.endDate 
            ? `${event.endDate} 23:59:59`
            : null;

        const updateEventQuery = `
          UPDATE events SET
            event_name = $1,
            event_description = $2,
            event_location = $3,
            event_age = $4,
            banner_url = COALESCE($5, banner_url),
            event_start = $6,
            event_end = $7
          WHERE event_id = $8
          RETURNING *
        `;

        await client.query(updateEventQuery, [
          event.name,
          event.description,
          event.address,
          parseInt(event.age),
          event.image,
          eventStart,
          eventEnd,
          id
        ]);
      }

      // Update layout nếu có
      if (layout) {
        // Update layout_json
        const updateLayoutQuery = `
          UPDATE layout SET
            layout_json = $1
          WHERE event_id = $2
        `;

        await client.query(updateLayoutQuery, [
          JSON.stringify(layout),
          id
        ]);

        // Xóa zones cũ và tạo mới
        await client.query('DELETE FROM zones WHERE event_id = $1', [id]);

        const zoneInsertPromises = layout.zones
          .filter(zone => zone.status !== false)
          .map(zone => {
            const zoneInsertQuery = `
              INSERT INTO zones (
                event_id, zone_code, zone_name, zone_description,
                zone_quantity, sold_quantity, zone_price, status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            return client.query(zoneInsertQuery, [
              id,
              zone.id,
              zone.name,
              zone.description || `${zone.type} zone`,
              zone.total_quantity || 0,
              0,
              zone.price || 0,
              zone.status !== false
            ]);
          });

        await Promise.all(zoneInsertPromises);
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật sự kiện thành công'
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Lỗi cập nhật sự kiện:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật sự kiện',
        error: err.message
      });
    } finally {
      client.release();
    }
  },

  // ============ XÓA SỰ KIỆN (BỔ SUNG) ============
  async deleteEvent(req, res) {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      await client.query('BEGIN');

      // Xóa zones trước (foreign key)
      await client.query('DELETE FROM zones WHERE event_id = $1', [id]);
      
      // Xóa layout
      await client.query('DELETE FROM layout WHERE event_id = $1', [id]);
      
      // Xóa event
      const result = await client.query(
        'DELETE FROM events WHERE event_id = $1 RETURNING event_name',
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sự kiện'
        });
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: `Xóa sự kiện "${result.rows[0].event_name}" thành công`
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Lỗi xóa sự kiện:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa sự kiện',
        error: err.message
      });
    } finally {
      client.release();
    }
  },

  // ============ TOGGLE STATUS SỰ KIỆN (BỔ SUNG) ============
  async toggleEventStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const query = `
        UPDATE events SET
          event_status = $1
        WHERE event_id = $2
        RETURNING event_id, event_name, event_status
      `;

      const result = await pool.query(query, [status, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sự kiện'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái sự kiện thành công',
        data: result.rows[0]
      });

    } catch (err) {
      console.error('❌ Lỗi cập nhật trạng thái:', err);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật trạng thái',
        error: err.message
      });
    }
  }
};

// ============ HELPER FUNCTION ============
function generateLayoutCode(eventName) {
  const prefix = eventName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
  
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${random}`;
}