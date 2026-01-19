import { pool } from "../../config/database.js";

export const EventControllers = {
  // ============ LẤY DANH SÁCH SỰ KIỆN ============
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

  // ============ TẠO SỰ KIỆN MỚI (CHỈ EVENT, KHÔNG CÓ LAYOUT/ZONES) ============
  async createEvent(req, res) {
    try {
      const { event } = req.body;

      // Validation cơ bản
      if (!event) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin event"
        });
      }

      // Kiểm tra các trường bắt buộc
      const requiredFields = ['name', 'category', 'date', 'address', 'age', 'description'];
      for (const field of requiredFields) {
        if (!event[field]) {
          return res.status(400).json({
            success: false,
            message: `Thiếu trường bắt buộc: ${field}`
          });
        }
      }

      // 1. Tạo thời gian event_start và event_end
      const eventStart = event.time 
        ? `${event.date} ${event.time}:00`
        : `${event.date} 00:00:00`;
      
      const eventEnd = event.endDate && event.endTime
        ? `${event.endDate} ${event.endTime}:00`
        : event.endDate 
          ? `${event.endDate} 23:59:59`
          : null;

      // 2. Insert vào bảng events (KHÔNG CÓ event_layout vì chưa tạo layout)
      const eventInsertQuery = `
        INSERT INTO events (
          event_name,
          event_description,
          event_location,
          event_age,
          banner_url,
          category_id,
          event_start,
          event_end,
          event_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING event_id, event_name, created_at
      `;

      const eventResult = await pool.query(eventInsertQuery, [
        event.name,
        event.description,
        event.address,
        parseInt(event.age),
        event.image || 'https://via.placeholder.com/800x400',
        parseInt(event.category),
        eventStart,
        eventEnd,
        false // mặc định là chưa active
      ]);

      // Trả về response thành công
      return res.status(201).json({
        success: true,
        message: 'Tạo sự kiện thành công! Bạn có thể thêm layout và zones sau.',
        data: {
          event: eventResult.rows[0]
        }
      });

    } catch (err) {
      console.error('❌ Lỗi tạo sự kiện:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo sự kiện',
        error: err.message
      });
    }
  },

  // ============ LẤY CHI TIẾT 1 SỰ KIỆN ============
  async getEventById(req, res) {
    try {
      const { id } = req.params;

      // Lấy tất cả thông tin event giống getAllEvent
      const eventQuery = `
        SELECT *
        FROM events
        WHERE event_id = $1
      `;

      const eventResult = await pool.query(eventQuery, [id]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sự kiện'
        });
      }

      // Trả về đầy đủ thông tin event
      return res.status(200).json({
        success: true,
        data: eventResult.rows[0],
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

  // ============ CẬP NHẬT SỰ KIỆN (CHỈ THÔNG TIN EVENT, KHÔNG BAO GỒM LAYOUT/ZONES) ============
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const { event } = req.body;

      if (!event) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin event'
        });
      }

      // Tạo thời gian event_start và event_end
      const eventStart = event.time 
        ? `${event.date} ${event.time}:00`
        : `${event.date} 00:00:00`;
      
      const eventEnd = event.endDate && event.endTime
        ? `${event.endDate} ${event.endTime}:00`
        : event.endDate 
          ? `${event.endDate} 23:59:59`
          : null;

      // Update thông tin event
      const updateEventQuery = `
        UPDATE events SET
          event_name = $1,
          event_description = $2,
          event_location = $3,
          event_age = $4,
          banner_url = COALESCE($5, banner_url),
          category_id = $6,
          event_start = $7,
          event_end = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE event_id = $9
        RETURNING *
      `;

      const result = await pool.query(updateEventQuery, [
        event.name,
        event.description,
        event.address,
        parseInt(event.age),
        event.image,
        parseInt(event.category),
        eventStart,
        eventEnd,
        id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sự kiện'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật sự kiện thành công',
        data: result.rows[0]
      });

    } catch (err) {
      console.error('❌ Lỗi cập nhật sự kiện:', err);
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật sự kiện',
        error: err.message
      });
    }
  },

  // ============ XÓA SỰ KIỆN ============
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

  // ============ TOGGLE STATUS SỰ KIỆN ============
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

// ============ HELPER FUNCTION (KHÔNG CÒN DÙNG) ============
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