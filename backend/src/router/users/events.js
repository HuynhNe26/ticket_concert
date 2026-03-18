import express from "express";
import { EventControllers } from "../../controllers/users/event_Controllers.js";

const router = express.Router();

router.get("/search", EventControllers.searchEvents);
router.get("/", EventControllers.getAllEvents);
router.get("/:id", EventControllers.getEventById);

router.get("/top-trending", EventControllers.getEventById);
router.get("/event-month", EventControllers.getEventById);
router.get("/category/:id", EventControllers.getEventById);

export default router;