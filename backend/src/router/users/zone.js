import express from "express";
import { ZoneControllers } from "../../controllers/users/zone.js";

const router = express.Router();

router.get("/", ZoneControllers.getAllZone);

export default router;