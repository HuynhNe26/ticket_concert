import dotenv from "dotenv";
dotenv.config({ override: true });

import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../config/database.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function retrieveDocs(query, topK = 5) {
  try {
    const keywords = query.split(" ").filter((w) => w.length > 2);
    const conditions = keywords.map((_, i) => `content ILIKE $${i + 1}`).join(" OR ");
    const values = keywords.map((k) => `%${k}%`);

    let rows = [];

    if (keywords.length > 0) {
      const result = await pool.query(
        `SELECT title, content, meta, 1 AS similarity
         FROM rag_documents
         WHERE ${conditions}
         LIMIT $${keywords.length + 1}`,
        [...values, topK]
      );
      rows = result.rows;
    }

    if (rows.length === 0) {
      const fallback = await pool.query(
        `SELECT title, content, meta, 1 AS similarity
         FROM rag_documents
         LIMIT $1`,
        [topK]
      );
      return fallback.rows;
    }

    return rows;
  } catch (dbError) {
    console.error("Lỗi truy vấn Database:", dbError.message);
    return [];
  }
}

export async function ragChat(userMessage) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong file .env");
  }

  const docs = await retrieveDocs(userMessage);

  const context =
    docs.length > 0
      ? docs.map((d, i) => `[${i + 1}] ${d.title}\n${d.content}`).join("\n\n---\n\n")
      : "Không tìm thấy dữ liệu phù hợp trong kho kiến thức.";

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const finalPrompt = `
Bạn là trợ lý AI hỗ trợ mua vé sự kiện âm nhạc.
Hãy trả lời dựa trên thông tin được cung cấp bên dưới.
Nếu không có thông tin liên quan, hãy thành thật nói không biết thay vì bịa đặt.
Trả lời ngắn gọn, thân thiện bằng tiếng Việt.

Thông tin tham khảo:
${context}

Câu hỏi từ khách hàng: ${userMessage}`;

  try {
    const result = await model.generateContent(finalPrompt);
    const text = result.response.text();

    return {
      answer: text,
      sources: docs.map((d) => ({ title: d.title, similarity: d.similarity })),
    };
  } catch (error) {
    console.error("Lỗi gọi Gemini:", error.message);

    if (error.message.includes("429")) {
      return {
        answer: "Hệ thống đang bận, vui lòng thử lại sau 1 phút nhé!",
        sources: [],
      };
    }

    if (error.message.includes("404")) {
      return {
        answer: "Model AI tạm thời không khả dụng, vui lòng thử lại sau.",
        sources: [],
      };
    }

    throw new Error("Không thể kết nối với AI, vui lòng thử lại sau.");
  }
}