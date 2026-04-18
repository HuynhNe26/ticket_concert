import { pool } from "../../config/database.js";

export const EventControllers = {

  async searchEvents(req, res) {
    try {
      const { q, dateStart, dateEnd, location } = req.query;
      
      let query = `
        SELECT event_id, event_name, banner_url, event_start, event_location, event_artist,
               (SELECT MIN(zone_price) FROM zones WHERE event_id = events.event_id) as min_price
        FROM events
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      if (q) {
        const words = q.trim().split(/\s+/).filter(Boolean);
        words.forEach(word => {
          query += ` AND (
            event_name ILIKE $${paramCount}
            OR jsonb_path_exists(COALESCE(event_artist, '[]'::jsonb), $${paramCount + 1}::jsonpath)
          )`;
          params.push(`%${word}%`);
          params.push(`$[*] ? (@.name like_regex "${word}" flag "i")`);
          paramCount += 2;
        });
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
          SELECT 
            event_id,
            event_name,
            banner_url,
            event_start,
            event_location,
            (
              SELECT MIN(zone_price) 
              FROM zones 
              WHERE event_id = events.event_id
            ) as min_price,
            event_status,
            event_end
        FROM events
        WHERE event_status = true
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

  async getEventTopTrending(req, res) {
    const { month, year } = req.query;

    try {
      const formattedMonth = String(month).padStart(2, '0');
      const startDate = `${year}-${formattedMonth}-01 00:00:00`;

      const endDate = new Date(year, formattedMonth, 0)
        .toISOString()
        .split("T")[0] + " 23:59:59";

      let query = `
        SELECT 
          e.event_id,
          e.event_name,
          e.event_start,
          e.event_end,
          e.banner_url,
          SUM(z.zone_quantity) AS total_quantity,
          SUM(z.sold_quantity) AS total_sold,
          SUM(z.sold_quantity)::float / SUM(z.zone_quantity) AS sold_percent
      FROM events e
      JOIN zones z ON z.event_id = e.event_id
      WHERE 
          e.event_start <= $2
          AND e.event_end >= $1
          AND e.event_end >= NOW()
          AND e.event_status = true
      GROUP BY 
          e.event_id,
          e.event_name,
          e.event_start,
          e.event_end,
          e.banner_url
      ORDER BY sold_percent DESC
      LIMIT 10;
      `;

      const { rows } = await pool.query(query, [startDate, endDate]);

      res.status(200).json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Lỗi server"
      });
    }
  },

  async getEventMonth(req, res) {
    const { month, year } = req.query;

    try {
      const startDate = `${year}-${month}-01 00:00:00`;

      const endDate = new Date(year, month, 0)
        .toISOString()
        .split("T")[0] + " 23:59:59";

      let query = `
      SELECT 
          event_id, 
          event_name, 
          banner_url, 
          event_start, 
          event_end, 
          event_status,
          (SELECT MIN(zone_price) FROM zones WHERE event_id = events.event_id) as min_price
      FROM events
      WHERE 
          event_start  <= $2
          AND event_end >= $1
          AND event_end >= NOW()
          AND event_status = true
      ORDER BY event_start ASC;
      `

      const { rows } = await pool.query(query, [startDate, endDate]) ;

      res.status(200).json({
        success: true,
        message: "Lấy sự kiện theo tháng thành công!",
        data: rows
      })

    } catch (err) {
      console.error("Lỗi lấy sự kiện theo thánng:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  async getEventWeek(req, res) {
    const { start, end } = req.query;

    try {
      const query = `
        SELECT 
            event_id, 
            event_name, 
            banner_url, 
            event_start, 
            event_end, 
            event_status,
            (SELECT MIN(zone_price) FROM zones WHERE event_id = events.event_id) as min_price
        FROM events
        WHERE event_end <= $2
            AND event_end >= $1
            AND event_status = true
        ORDER BY event_start ASC;
      `;

      const { rows } = await pool.query(query, [start, end]);

      res.status(200).json({
        success: true,
        message: "Lấy sự kiện theo tuần thành công!",
        data: rows
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

async addFavoriteKeyword(req, res) {
  const userId = req.user.userId;
  const { event_id, search } = req.body;

  if (!event_id || !search) {
    return res.status(400).json({
      success: false,
      message: "Thiếu event_id hoặc search"
    });
  }

  const newItem = {
    event_id,
    search: search.trim().toLowerCase()
  };

  try {
    await pool.query(
    `
    UPDATE users
    SET favorite = (
      SELECT COALESCE(jsonb_agg(v), '[]'::jsonb)
      FROM (
        SELECT v
        FROM jsonb_array_elements(COALESCE(favorite, '[]'::jsonb)) v
        WHERE v->>'event_id' <> $1
        UNION ALL
        SELECT $2::jsonb
        LIMIT 5
      ) t
    )
    WHERE user_id = $3
    `,
    [String(event_id), JSON.stringify(newItem), userId]
  );

    res.json({ success: true });
  } catch (err) {
    console.error("Lỗi addFavoriteKeyword:", err);
    res.status(500).json({ success: false });
  }
},

async getSimilar(req, res) {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ success: false, error: "eventId không hợp lệ." });
      }
      const limit  = Math.min(parseInt(req.query.limit) || 4, 10);
      const events = await getSimilarEvents(eventId, limit);
      return res.json({ success: true, events });
 
    } catch (err) {
      console.error("getSimilar error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
},

};