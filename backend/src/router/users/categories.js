import express from "express";
import { CategoryControllers } from "../../controllers/users/categories.js";

const router = express.Router();
router.get("/",  CategoryControllers.getCategories);

export default router;