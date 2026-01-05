import express from "express";
import { LayoutControllers } from "../../controllers/users/layout.js";

const router = express.Router();

router.get("/", LayoutControllers.getAllLayout);

export default router;