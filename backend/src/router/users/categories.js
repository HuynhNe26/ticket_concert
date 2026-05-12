import express from "express";
import { CategoryControllers } from "../../controllers/users/categories.js";

const router = express.Router();

router.get("/", CategoryControllers.getAllCategories); 
router.get('/all', CategoryControllers.getAllCategories);

export default router;