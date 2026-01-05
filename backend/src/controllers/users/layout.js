import { pool } from "../../config/database.js";

export const LayoutControllers = {

  async getAllLayout(req, res) {
    try {
        const { rows } = await pool.query("SELECT * from layout");

        if (rows.length == 0) {
            res.status(400).json({
                success: false, 
                message: "Lỗi lấy thông tin giao diện sân khấu"
            })
        }

        res.status(200).json({
            success: true, 
            message: "Lấy tất cả giao diện thành công!", 
            data: rows
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