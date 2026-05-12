import express from "express";
import { EventControllers } from "../../controllers/users/event_Controllers.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();

router.get("/search", EventControllers.searchEvents);
router.get("/", EventControllers.getAllEvents);
router.get("/top-trending", EventControllers.getEventTopTrending);
router.get("/event-weeks", EventControllers.getEventWeek);
router.get("/event-month", EventControllers.getEventMonth);
router.post("/favorite", authMiddleware, EventControllers.addFavoriteKeyword);
router.get("/:id", EventControllers.getEventById);

export default router;