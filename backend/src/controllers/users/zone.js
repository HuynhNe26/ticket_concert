import { pool } from "../../config/database.js";

export const ZoneControllers = {

  async getZonebyId(req, res) {
    try {
      const { id } = req.params
      let query = `SELECT * FROM zones WHERE event_id = $1`
      const { rows } = pool.query(query, id)

      if (rows.length === 0) {
            res.status(400).json({
                success: false, 
                message: "Lỗi lấy thông tin vé"
            })
        }

        res.status(200).json({
            success: true, 
            message: "Lấy tất cả thông tin vé!", 
            data: rowsn
        })
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server!",
        })
        console.error("Lỗi lấy tất cả vé: ", error)
    }
  }
};