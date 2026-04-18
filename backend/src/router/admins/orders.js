import express from "express";
import { OrderControllers } from "../../controllers/admins/orders.js";

const router = express.Router();

router.get("/order-detail/:id", OrderControllers.seeOrderDetail); 
router.get("/", OrderControllers.getAllOrders); 

export default router;