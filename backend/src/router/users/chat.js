import express from "express";
import { ragChat } from "../../middlewares/ragChain.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Tin nhắn không được trống" });
    }

    const result = await ragChat(message);

    res.json({ reply: result.answer });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Lỗi server" });
  }
});

export default router;