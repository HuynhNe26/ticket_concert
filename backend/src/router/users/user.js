import express from "express";
import {authControllers} from "../../controllers/users/auth_Controllers.js";
import { EventControllers } from "../../controllers/users/event_Controllers.js";

const router = express.Router();

router.post("/login", authControllers.login);
router.post("/register", authControllers.register);
router.post("/login-google", authControllers.loginGoogle);
router.get("/search", EventControllers.searchEvents);

export default router;