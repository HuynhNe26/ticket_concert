import express from "express";
import { Manage_userControllers } from "../../controllers/admins/user.js";
import { adminAuth } from "../../middlewares/adminAuth.js";

const router = express.Router();

router.get("/", adminAuth, Manage_userControllers.getAllUsers);
router.get("/:id", adminAuth, Manage_userControllers.getUserDetail);

export default router;