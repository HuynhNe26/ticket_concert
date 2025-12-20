import express from "express";
import { Manage_userControllers } from "../../controllers/admins/manage_user.js";
import { adminAuth } from "../../middlewares/adminAuth.js";

const router = express.Router();

router.get("/users", adminAuth, Manage_userControllers.getAllUsers);
router.put("/users/:id", adminAuth, Manage_userControllers.updateUser); 
router.delete("/users/:id", adminAuth, Manage_userControllers.deleteUser);
router.get("/memberships", adminAuth, Manage_userControllers.getAllMemberships);

export default router;