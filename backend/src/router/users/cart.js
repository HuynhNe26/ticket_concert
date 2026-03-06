import express from "express";
import { addToCart, getCart } from "../../controllers/users/cart.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();
router.post("/:id", authMiddleware, addToCart);
router.get("/", authMiddleware, getCart);

export default router;