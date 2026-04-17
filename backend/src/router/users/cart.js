import express from "express";
import { addToCart, deleteCart, getCart } from "../../controllers/users/cart.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();
router.post("/:id", authMiddleware, addToCart);
router.get("/", authMiddleware, getCart);
router.delete("/", authMiddleware, deleteCart)

export default router;