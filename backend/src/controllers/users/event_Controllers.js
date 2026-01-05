import { pool } from "../../config/database.js";

export const EventControllers = {

  async searchEvents(req, res) {
    try {
      const { q, dateStart, dateEnd, location, category } = req.query;
      
      let query = `
        SELECT event_id, event_name, banner_url, event_start, event_location, 
               (SELECT MIN(zone_price) FROM zones WHERE event_id = events.event_id) as min_price
        FROM events
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      if (q) {
        query += ` AND event_name ILIKE $${paramCount}`;
        params.push(`%${q}%`);
        paramCount++;
      }

      if (dateStart) {
        query += ` AND event_start >= $${paramCount}`;
        params.push(dateStart);
        paramCount++;
      }
      if (dateEnd) {
        query += ` AND event_start <= $${paramCount}`;
        params.push(dateEnd + ' 23:59:59'); 
        paramCount++;
      }

      if (location && location !== 'Toàn quốc') {
        query += ` AND event_location ILIKE $${paramCount}`;
        params.push(`%${location}%`);
        paramCount++;
      }
      query += ` ORDER BY event_start ASC`;

      const { rows } = await pool.query(query, params);

      return res.json({
        success: true,
        data: rows,
      });

    } catch (err) {
      console.error("Search events error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },
  
  async getAllEvents(req, res) {
    try {
      const query = `
        SELECT event_id, event_name, banner_url, event_start, event_location, 
               (SELECT MIN(zone_price) FROM zones WHERE event_id = events.event_id) as min_price
        FROM events
        ORDER BY created_at DESC
      `;
      const { rows } = await pool.query(query);

      return res.json({
        success: true,
        data: rows,
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách sự kiện:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },
  
  async getEventById(req, res) {
    try {
        const { id } = req.params;
        const eventId = parseInt(id); 

        if (isNaN(eventId)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const query = `
            SELECT e.*, 
                   (SELECT MIN(zone_price) FROM zones WHERE event_id = e.event_id) as min_price
            FROM events e 
            WHERE e.event_id = $1
        `;
        const { rows } = await pool.query(query, [eventId]);
        
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
        
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error("Lỗi lấy chi tiết:", err);
        return res.status(500).json({ message: "Lỗi server" });
    }
  },
};