import express from "express";
import { login, loginGoogle, register } from "../../controllers/users/auth_Controllers.js";
import { EventControllers } from "../../controllers/users/event_Controllers.js";

const router = express.Router();

router.post("/login", login);
router.post("/login-google", loginGoogle);
router.post("/register", register);
router.get("/search", EventControllers.searchEvents);

export default router;