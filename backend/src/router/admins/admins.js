import express from "express";
import { AdminControllers } from "../../controllers/admins/admins.js";
import { adminAuth } from "../../middlewares/adminAuth.js";

const router = express.Router();

router.post("/login", AdminControllers.login); 
router.get("/profile", adminAuth, AdminControllers.profile);
router.get("/:id", AdminControllers.getAdminById);
router.get("/create", AdminControllers.create);

export default router;