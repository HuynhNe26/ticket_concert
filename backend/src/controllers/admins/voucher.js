import { pool } from "../../config/database.js";

export const VoucherControllers = {
    async getVoucher(req, res) {
        const { month, year, code } = req.query;

        try {
            let query = `
                SELECT *
                FROM vouchers
                WHERE 1=1
            `;

            const params = [];
            let index = 1;

            if (month) {
                query += ` AND EXTRACT(MONTH FROM voucher_start) = $${index}`;
                params.push(Number(month));
                index++;
            }

            if (year) {
                query += ` AND EXTRACT(YEAR FROM voucher_start) = $${index}`;
                params.push(Number(year));
                index++;
            }

            if (code) {
                query += ` AND voucher_code ILIKE $${index}`;
                params.push(`%${code}%`);
                index++;
            }

            query += ` ORDER BY voucher_start DESC`;

            const { rows } = await pool.query(query, params);

            res.status(200).json({
                success: true,
                message: "Lấy dữ liệu voucher thành công!",
                data: rows
            });

        } catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message: "Lỗi server",
            });
        }
    },

    async createVoucher(req, res) {
        const {
            voucher_code,
            voucher_value,
            voucher_type,
            min_order_value,
            max_reduction,
            voucher_start,
            voucher_end,
            voucher_quantity,
            description,
            distributor
        } = req.body;

        const distributor_img = req.files?.distributor_img?.[0]?.path || null;

        try {
            const check = await pool.query(
                `SELECT voucher_id FROM vouchers WHERE voucher_code = $1`,
                [voucher_code]
            );

            if (check.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Mã voucher đã tồn tại"
                });
            }

            const query = `
                INSERT INTO vouchers (
                    voucher_code,
                    voucher_value,
                    voucher_type,
                    min_order_value,
                    max_reduction,
                    voucher_start,
                    voucher_end,
                    voucher_quantity,
                    voucher_used,
                    description,
                    distributor,
                    distributor_img,
                    voucher_status
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,FALSE)
                RETURNING *
            `;

            const values = [
                voucher_code,
                voucher_value,
                voucher_type,
                min_order_value,
                max_reduction,
                voucher_start,
                voucher_end,
                voucher_quantity,
                description,
                distributor,
                distributor_img
            ];

            console.log(values)

            const { rows } = await pool.query(query, values);

            res.status(201).json({
                success: true,
                message: "Tạo voucher thành công",
                data: rows[0]
            });

        } catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message: "Lỗi server"
            });
        }
    },

    async changeStatus(req, res) {
        try {
            const { voucher_status } = req.body;
            const { id } = req.params;

            let query = `
            UPDATE vouchers
            SET voucher_status = $1
            WHERE voucher_id = $2
            `

            await pool.query(query, [voucher_status, id]);

            res.status(200).json({
                success: true,
                message: "Thay đổi trạng thái voucher thành công!"
            })
        } catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message: "Lỗi server"
            });
        }
    },

    async deleteVoucher(req, res) {
        try {
            const { id } = req.params;

            const check = await pool.query(`SELECT voucher_status FROM vouchers WHERE voucher_id = $1 AND voucher_status = $2`, [id, false])

            if (check.rows.length == 0) {
                res.status(400).json({
                    success: false,
                    message: "Voucher không ở trạng thái đóng!"
                })
            }

            let query = `DELETE FROM vouchers WHERE voucher_id = $1`

            await pool.query(query, [id])

            res.status(200).json({
                success: true,
                message: "Xóa voucher thành công!"
            })

        } catch (err) {
            console.log(err);
            res.status(500).json({
                success: false,
                message: "Lỗi server"
            });
        }
    }
};