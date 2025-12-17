import express from "express";
import { AdminControllers } from "../../controllers/admins/admins.js";
import { Manage_userControllers } from "../../controllers/admins/manage_user.js";
import { adminAuth } from "../../middlewares/adminAuth.js";

const router = express.Router();

router.post("/login", AdminControllers.login); 
router.get("/profile", adminAuth, AdminControllers.profile);
router.post("/create", AdminControllers.create);
router.get("/", AdminControllers.getAllAdmin);
router.get("/users", adminAuth, Manage_userControllers.getAllUsers);
router.put("/users/:id", adminAuth, Manage_userControllers.updateUser); 
router.delete("/users/:id", adminAuth, Manage_userControllers.deleteUser);
router.get("/memberships", adminAuth, Manage_userControllers.getAllMemberships);
router.get("/:id", AdminControllers.getAdminById);

export default router;