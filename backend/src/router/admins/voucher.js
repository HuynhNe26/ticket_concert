import express from "express";
import { VoucherControllers } from "../../controllers/admins/voucher.js";
import uploadCloud from "../../middlewares/upload.js";

const router = express.Router();

router.get("/", VoucherControllers.getVoucher);
router.post("/create", uploadCloud.fields([{name: 'distributor_img', maxCount: 1}]), VoucherControllers.createVoucher);
router.patch("/:id/status", VoucherControllers.changeStatus);
router.delete("/:id", VoucherControllers.deleteVoucher);

export default router;