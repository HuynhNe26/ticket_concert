import express from "express";
import { addToCart, deleteCart, getCart, deleteCartItem } from "../../controllers/users/cart.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();
router.post("/:id", authMiddleware, addToCart);
router.get("/", authMiddleware, getCart);
router.delete("/", authMiddleware, deleteCart)
router.delete("/:event_id/:zone_id", authMiddleware, deleteCartItem);
export default router;