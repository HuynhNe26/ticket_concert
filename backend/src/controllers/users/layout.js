import { pool } from "../../config/database.js";

export const LayoutControllers = {
  async getLayoutbyid(req, res) {
    try {
      const { id } = req.params;

      const query = `SELECT * FROM layout WHERE event_id = $1`;
      const { rows } = await pool.query(query, [id]); 

      if (rows.length === 0) {
        return res.status(404).json({
          success: false, 
          message: "Không tìm thấy layout cho sự kiện này"
        });
      }

      return res.status(200).json({
        success: true, 
        message: "Lấy layout thành công!", 
        data: rows[0]
      });
    }
    catch (error) {
      console.error("Lỗi lấy layout:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server!",
        error: error.message
      });
    }
  }
};
