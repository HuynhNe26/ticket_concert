import express from "express";
import { TicketControllers } from "../../controllers/users/ticket.js";
import { authMiddleware } from "../../middlewares/userAuth.js";

const router = express.Router();

router.get("/", authMiddleware, TicketControllers.myTicket);

export default router;