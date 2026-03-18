import express from "express";
import { checkout } from "../../controllers/users/checkout.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();
router.post("/", authMiddleware, checkout);

export default router;