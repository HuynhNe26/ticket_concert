import express from "express";
import { EventControllers } from "../../controllers/users/event_Controllers.js";

const router = express.Router();

router.get("/search", EventControllers.searchEvents);
router.get("/", EventControllers.getAllEvents);

export default router;