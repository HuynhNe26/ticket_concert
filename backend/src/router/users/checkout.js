import express from "express";
import {Checkout} from "../../controllers/users/checkout.js"
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();
router.post("/momo", authMiddleware, Checkout.createMomo);
router.post("/momo/notify", Checkout.momoNotify);

router.post("/vnpay", authMiddleware, Checkout.createVnpay);
router.get("/vnpay/notify", Checkout.vnpayNotify);

export default router;