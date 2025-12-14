import express from "express";
import { UserController } from "../../controllers/users/users.js";

const router = express.Router();

router.get("/", UserController.getAll);
router.post("/", UserController.create); 

export default router;