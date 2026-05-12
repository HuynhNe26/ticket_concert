import express from "express";
import { LayoutControllers } from "../../controllers/users/layout.js";

const router = express.Router();

router.get("/:id", LayoutControllers.getLayoutbyid);

export default router;