import express from "express";
import { authControllers } from "../../controllers/users/auth_Controllers.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();

router.post("/login", authControllers.login);
router.post("/login-google", authControllers.loginGoogle);
router.post("/update-profile-gg", authMiddleware, authControllers.updateProfile)
router.post("/register", authControllers.register);
router.get("/profile",authMiddleware, authControllers.getProfile);
router.put("/change-profile", authMiddleware, authControllers.changeProfile);
router.post("/logout", authControllers.logout);
router.post("/forgetPassword", authControllers.sendotp);
router.post("/checkotp", authControllers.verifyopt);
router.post("/resetPassword", authControllers.resetPassword);
router.get("/verify-email", authControllers.verifyEmail);
export default router;