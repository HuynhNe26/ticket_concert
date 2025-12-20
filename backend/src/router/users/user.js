import express from "express";
import { authControllers } from "../../controllers/users/auth_Controllers.js";

const router = express.Router();

router.post("/login", authControllers.login);
router.post("/login-google", authControllers.loginGoogle);
router.post("/register", authControllers.register);
router.get("/profile", authControllers.getProfile);
router.post("/logout", authControllers.logout);

export default router;