import express from "express";
import { getAvailableVouchers, validateVoucher } from "../../controllers/users/voucher.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();

router.post("/validate", authMiddleware, validateVoucher);
router.get("/getvoucher", authMiddleware, getAvailableVouchers)
export default router;