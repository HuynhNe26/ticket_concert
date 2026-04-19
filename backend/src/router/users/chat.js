import express from "express";
import { agentChat } from "../../agent/Chat.service.js";
import { optionalAuth } from "../../middlewares/userAuth.js";

const router = express.Router();
router.post("/", optionalAuth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Tin nhắn không được trống" });
    }

    const userId = req.user?.userId ?? null;

    const result = await agentChat(message, sessionId || "default", userId);

    res.json({
      reply:       result.answer,  
      answer:      result.answer,
      toolsUsed:   result.toolsUsed,
      sessionId:   result.sessionId,
      cartPayload: result.cartPayload ?? null,
    });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Lỗi server" });
  }
});

export default router;