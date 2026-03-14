import express from "express";
import { OrderControllers } from "../../controllers/admins/orders.js";

const router = express.Router();

router.get("/", OrderControllers.manageOrder); 

export default router;