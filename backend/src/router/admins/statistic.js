import express from "express";
import { StatisticControllers } from "../../controllers/admins/statistic.js";

const router = express.Router();

router.get("/calendar", StatisticControllers.getCalendarEvents);
router.get("/orders", StatisticControllers.getAllOrders);

export default router;