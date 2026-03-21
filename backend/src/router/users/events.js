import express from "express";
import { EventControllers } from "../../controllers/users/event_Controllers.js";

const router = express.Router();

router.get("/search", EventControllers.searchEvents);
router.get("/", EventControllers.getAllEvents);
router.get("/top-trending", EventControllers.getEventTopTrending);
router.get("/event-month", EventControllers.getEventMonth);
router.get("/category/:id", EventControllers.getEventCategory);
router.patch("/:id/status", EventControllers.changeStatusEvent);
router.get("/:id", EventControllers.getEventById);

export default router;