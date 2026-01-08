import { pool } from "../../config/database.js";

export const CategoriesControllers = {
  async getAllCategories(req, res) {
    try {
        const { rows } = await pool.query("SELECT * FROM categories");

        if (rows.length === 0) {
            res.status(400).json({
                sucess: false, 
                message: "Không có dữ liệu thể loại!"
            })
        } 
        return res.json({ 
            success: true, 
            data: rows 
        });
    } catch (err) {
        console.error("Lỗi lấy danh sách thể loại: ", err);
        return res.status(500).json({ 
            message: "Lỗi server" 
        });
    }
  },

  async getCategoryById (req, res) {
    try {
        const { id } = req.param

        if (!id) {
            res.status(400).json({
                success: false,
                message: "Không có id thể loại!"
            })
        }

        let query = `SELECT * FROM categories WHERE category_id = $1`;

        const { rows } = await pool.query(query, id)

        if (rows.length === 0) {
            res.status(401).json({
                success: false,
                message: `Không có dữ liệu thể loại nào với id=${id}`
            })
        }

        return res.status(200).json({
            success: true,
            message: "Lấy thể loại thành công theo id!",
            data: rows
        })
    } catch (err) {
        console.error("Lỗi lấy thể loại theo id: ", err);
        return res.status(500).json({
            message: "Lỗi server!"
        })
    }
  }
};