import { pool } from "../../config/database.js";

export const ZoneControllers = {
  async getZonebyId(req, res) {
    try {
      const { id } = req.params;
      
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
          status
        FROM zones 
        WHERE event_id = $1 
        ORDER BY zone_code
      `;
      
      const { rows } = await pool.query(query, [id]); 
      if (rows.length === 0) {
        return res.status(404).json({
          success: false, 
          message: "Không tìm thấy zone nào cho sự kiện này"
        });
      }

      return res.status(200).json({
        success: true, 
        message: "Lấy danh sách zones thành công!", 
        data: rows 
      });
    }
    catch (error) {
      console.error("Lỗi lấy zones:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
        error: error.message
      });
    }
  }
};