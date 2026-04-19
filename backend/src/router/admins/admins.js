import express from "express";
import { AdminControllers } from "../../controllers/admins/admins.js";
import { adminAuth } from "../../middlewares/adminAuth.js";

const router = express.Router();

router.put("/resetPass/:id", AdminControllers.resetPass); 
router.post("/login", AdminControllers.login); 
router.get("/profile", adminAuth, AdminControllers.profile);
router.post("/create", AdminControllers.create);
router.get("/search", AdminControllers.searchAdmin); 
router.get("/", AdminControllers.getAllAdmin);
router.get("/:id", AdminControllers.getAdminById); 
router.put("/update/:id", AdminControllers.updateAdmin); 
router.put("/update-profile", adminAuth, AdminControllers.updateProfile); 

export default router;