import { agentChat, clearSession } from "../../agent/Chat.service.js";
import { v4 as uuidv4 } from "uuid";
export const Agent = {
async handleChat(req, res) {
    try {
      const { message, sessionId } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: "message là bắt buộc" });
      }

      const sid = sessionId || uuidv4();
      const userId = req.user?.user_id || req.user?.userId || req.user?.id || null;
      const result = await agentChat(message.trim(), sid, userId);

      return res.json({
        success: true,
        sessionId: sid,
        answer: result.answer,
        toolsUsed: result.toolsUsed,
      });
    } catch (err) {
      console.error("Chat API error:", err);
      return res.status(500).json({ success: false, error: err.message || "Lỗi server" });
    }
  },

  createNewSession(req, res) {
    const sessionId = uuidv4();
    res.json({ success: true, sessionId });
  },

  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      await clearSession(sessionId);
      res.json({ success: true, message: `Session ${sessionId} đã được xóa` });
    } catch (err) {
      console.error("Delete session error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  checkHealth(req, res) {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  },

};