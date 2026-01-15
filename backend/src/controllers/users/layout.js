import { pool } from "../../config/database.js";

export const LayoutControllers = {

  async getLayoutbyid(req, res) {
    try {
        const { id } = req.params
        let query = `SELECT * FROM layout WHERE event_id = $1`
        const { rows } = pool.query(query, id)

        if (rows.length === 0) {
            res.status(400).json({
                success: false, 
                message: "Lỗi lấy thông tin giao diện sân khấu"
            })
        }

        res.status(200).json({
            success: true, 
            message: "Lấy tất cả giao diện thành công!", 
            data: rowsn
        })
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server!",
        })
        console.error("Lỗi lấy tất cả giao diện: ", error)
    }
  }
};