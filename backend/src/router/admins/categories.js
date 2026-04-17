import express from "express";
import  { CategoriesControllers }  from "../../controllers/admins/catgories.js";

const router = express.Router();

router.get("/", CategoriesControllers.getAllCategories);
router.get("/:id", CategoriesControllers.getCategoryById);
router.delete("/:id", CategoriesControllers.deleteCategory); 
router.post("/", CategoriesControllers.createCategory);

export default router;