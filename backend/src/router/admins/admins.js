import express from "express";
import { AdminControllers } from "../../controllers/admins/admins.js";
import { adminAuth } from "../../middlewares/adminAuth.js";

const router = express.Router();

router.post("/login", AdminControllers.login); 
router.get("/profile", adminAuth, AdminControllers.profile);
router.post("/create", AdminControllers.create);
router.get("/", AdminControllers.getAllAdmin);
router.get("/users", adminAuth, AdminControllers.getAllUsers);
router.put("/users/:id", adminAuth, AdminControllers.updateUser); 
router.delete("/users/:id", adminAuth, AdminControllers.deleteUser);
router.get("/memberships", adminAuth, AdminControllers.getAllMemberships);
router.get("/:id", AdminControllers.getAdminById);

export default router;