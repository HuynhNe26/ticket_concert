import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database.js";

const JWT_SECRET = process.env.JWT_SECRET;

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
  }
};