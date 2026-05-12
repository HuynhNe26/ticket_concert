import express from "express";
import { Agent } from "../../controllers/users/agent.js"; 
import { optionalAuth } from "../../middlewares/userAuth.js";

const router = express.Router();

router.post("/chat",optionalAuth, Agent.handleChat);
router.post("/session/new", Agent.createNewSession);
router.delete("/session/:sessionId",optionalAuth, Agent.deleteSession);
router.get("/health", Agent.checkHealth);

export default router;