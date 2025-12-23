import express from "express";
import { EventControllers } from "../../controllers/admins/events.js";

const router = express.Router();

router.get("/", EventControllers.getAllEvent); 

export default router;