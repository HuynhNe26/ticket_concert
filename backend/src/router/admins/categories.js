import express from "express";
import  { CategoriesControllers }  from "../../controllers/admins/catgories.js";

const router = express.Router();

router.get("/", CategoriesControllers.getAllCategories);
router.get("/:id", CategoriesControllers.getCategoryById);

export default router;