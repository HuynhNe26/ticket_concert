import dotenv from "dotenv";
dotenv.config({ override: false });

import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../config/database.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getEmbedding(text) {
  const model = genAI.getGenerativeModel(
    { model: "gemini-embedding-001" },
    { apiVersion: "v1beta" }
  );
  const result = await model.embedContent(text);
  return result.embedding.values.slice(0, 768);
}

async function fetchDocuments() {
  const docs = [];

  const events = await pool.query(`
    SELECT e.event_id, e.event_name, e.event_description,
           e.event_location, e.event_start, e.event_end,
           e.event_age, e.event_actor, e.event_artist,
           c.category_name
    FROM events e
    JOIN categories c ON e.category_id = c.category_id
  `);

  for (const ev of events.rows) {
    const artists = ev.event_artist?.map((a) => a.name).join(", ") || "";
    docs.push({
      title: ev.event_name,
      content: `
        Tên sự kiện: ${ev.event_name}
        Mô tả: ${ev.event_description}
        Địa điểm: ${ev.event_location}
        Thời gian: ${ev.event_start} đến ${ev.event_end}
        Độ tuổi tối thiểu: ${ev.event_age}
        Nghệ sĩ: ${artists}
        Thể loại: ${ev.category_name}
      `.trim(),
      meta: { source_type: "event", source_id: ev.event_id },
    });
  }

  const zones = await pool.query(`
    SELECT z.*, e.event_name
    FROM zones z
    JOIN events e ON z.event_id = e.event_id
  `);

  for (const z of zones.rows) {
    const available = z.zone_quantity - z.sold_quantity;
    docs.push({
      title: `Vé ${z.zone_name} - ${z.event_name}`,
      content: `
        Sự kiện: ${z.event_name}
        Khu vực: ${z.zone_name} (${z.zone_code})
        Mô tả khu: ${z.zone_description}
        Giá vé: ${z.zone_price.toLocaleString("vi-VN")} VNĐ
        Tổng số vé: ${z.zone_quantity}
        Đã bán: ${z.sold_quantity}
        Còn lại: ${available}
        Trạng thái: ${available > 0 ? "Còn vé" : "Hết vé"}
      `.trim(),
      meta: {
        source_type: "zone",
        source_id: z.zone_id,
        zone_code: z.zone_code,
        event_id: z.event_id,
      },
    });
  }

  return docs;
}

async function embedAndStore() {
  console.log("🔄 Bắt đầu embedding...");

  await pool.query("DELETE FROM rag_documents");
  console.log("🗑️  Đã xóa dữ liệu cũ");

  const docs = await fetchDocuments();
  console.log(`📄 Tìm thấy ${docs.length} documents`);

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(`⚙️  [${i + 1}/${docs.length}] ${doc.title}`);

    const embedding = await getEmbedding(doc.content);

    await pool.query(
      `INSERT INTO rag_documents (source_type, source_id, title, content, embedding, meta)
       VALUES ($1, $2, $3, $4, $5::vector, $6)`,
      [
        doc.meta.source_type,
        doc.meta.source_id,
        doc.title,
        doc.content,
        JSON.stringify(embedding),
        JSON.stringify(doc.meta),
      ]
    );
  }

  console.log(" Embedding hoàn tất!");
  await pool.end();
}

embedAndStore().catch((err) => {
  console.error(" Lỗi đầy đủ:", err);
  pool.end();
  process.exit(1);
});