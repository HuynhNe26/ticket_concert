import dotenv from "dotenv";
dotenv.config({ override: true }); 

import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../config/database.js";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function retrieveDocs(query, topK = 4) {
  try {
    const { rows } = await pool.query(
      `SELECT title, content, meta, 1 AS similarity
       FROM rag_documents
       WHERE content ILIKE $1
       LIMIT $2`,
      [`%${query}%`, topK]
    );

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
    console.error("Lỗi truy vấn Database:", dbError);
    return [];
  }
}

export async function ragChat(userMessage) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong file .env");
  }

  const docs = await retrieveDocs(userMessage);
  
  const context = docs.length > 0 
    ? docs.map((d, i) => `[${i + 1}] ${d.title}\n${d.content}`).join("\n\n---\n\n")
    : "Không tìm thấy dữ liệu phù hợp trong kho kiến thức.";

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.0-pro"
  });

  const finalPrompt = `
Bạn là trợ lý AI hỗ trợ mua vé sự kiện âm nhạc. Trả lời dựa trên thông tin được cung cấp. Ngắn gọn, thân thiện bằng tiếng Việt.

Thông tin tham khảo:
${context}

Câu hỏi từ khách hàng: ${userMessage}`;

  try {
    const result = await model.generateContent(finalPrompt);
    const response = await result.response; 
    const text = response.text();
    
    return {
      answer: text,
      sources: docs.map((d) => ({ title: d.title, similarity: d.similarity })),
    };
  } catch (error) {
    console.error("Lỗi gọi Gemini:", error.message);
    if (error.message.includes("429")) {
      return {
        answer: "Hiện tại hệ thống đang bận do quá tải lượt yêu cầu miễn phí. Bạn vui lòng thử lại sau 1 phút nhé!",
        sources: []
      };
    }

    throw new Error("Không thể kết nối với AI, vui lòng thử lại sau.");
  }
}