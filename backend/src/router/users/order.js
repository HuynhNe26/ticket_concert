import express from "express";
import { OrderControllers } from "../../controllers/users/orders.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();

router.get("/", authMiddleware, OrderControllers.getOldOrderById);

export default router;