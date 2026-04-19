import express from "express";
import  {EventControllers}  from "../../controllers/admins/events.js";
import uploadCloud from "../../middlewares/upload.js";
const router = express.Router();

router.get("/", EventControllers.getAllEvent); 
router.get("/statistic", EventControllers.statistic); 
router.get("/calendar", EventControllers.getEvent); 
router.post("/create",uploadCloud.fields([{name: 'banner', maxCount: 1}]) ,EventControllers.createEvent);
router.get("/:id", EventControllers.getEventById);
router.put("/:id", EventControllers.updateEvent);
router.delete("/:id", EventControllers.deleteEvent);
router.patch("/:id/status", EventControllers.toggleEventStatus);

export default router;