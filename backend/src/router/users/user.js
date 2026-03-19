import express from "express";
import { authControllers } from "../../controllers/users/auth_Controllers.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();

router.post("/login", authControllers.login);
router.post("/login-google", authControllers.loginGoogle);
router.post("/register", authControllers.register);
router.get("/profile",authMiddleware, authControllers.getProfile);
router.post("/logout", authControllers.logout);

export default router;