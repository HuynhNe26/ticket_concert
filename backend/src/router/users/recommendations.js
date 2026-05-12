import express from "express";
import { getHybridRecommendations } from "../../agent/Recommendation.service.js";
import { optionalAuth } from "../../middlewares/userAuth.js";

const router = express.Router();

router.get("/for-you", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId ? req.user?.userId : null; 
    console.log(userId)
    const limit = Math.min(parseInt(req.query.limit) || 5, 5);

    const result = await getHybridRecommendations(userId, limit);

    return res.json({
      success: true,
      type: result.type,       
      data: result.events,
    });
  } catch (err) {
    console.error("[Recommendation Route] /for-you error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống gợi ý sự kiện",
    });
  }
});

export default router;
