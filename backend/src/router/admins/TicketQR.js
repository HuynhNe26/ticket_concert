import express from "express";
import { TicketQRController } from "../../controllers/admins/TicketQR.js";
import { adminAuth } from "../../middlewares/adminAuth.js";

const router = express.Router();

router.post("/", adminAuth, TicketQRController.scanQR);
router.post("/info", adminAuth, TicketQRController.getInfo);
export default router;