import "dotenv/config";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import { pool } from "../config/database.js";
import { formatCurrency } from "../utils/helpers.js";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
  taskType: "RETRIEVAL_DOCUMENT",
  outputDimensionality: 3072,
});

async function fetchDocuments() {
  const docs = [];

  // ─── EVENTS ───────────────────────────────────────────────────────────────
  const events = await pool.query(`
    SELECT e.event_id, e.event_name,
           e.event_location, e.event_start, e.event_end,
           e.event_age, e.event_actor, e.event_artist,
           e.event_status, c.category_name
    FROM events e
    JOIN categories c ON e.category_id = c.category_id
  `);

  for (const ev of events.rows) {
    const artists = ev.event_artist?.map((a) => a.name).join(", ") || "Chưa cập nhật";
    const startDate = new Date(ev.event_start).toLocaleDateString("vi-VN");
    const endDate = new Date(ev.event_end).toLocaleDateString("vi-VN");

    docs.push(
      new Document({
        pageContent: `
Tên sự kiện: ${ev.event_name}
Event ID: ${ev.event_id}
Địa điểm: ${ev.event_location}
Thời gian bắt đầu: ${startDate}
Thời gian kết thúc: ${endDate}
Độ tuổi tối thiểu: ${ev.event_age || "Không giới hạn"}
Nghệ sĩ: ${artists}
Thể loại: ${ev.category_name}
Trạng thái: ${ev.event_status ? "Đang mở bán" : "Chưa mở bán hoặc đã diễn ra"}
        `.trim(),
        metadata: {
          source_type: "event",
          source_id: ev.event_id,    
          event_id: ev.event_id,
          title: ev.event_name,
          status: ev.event_status,
        },
      })
    );
  }

  const zones = await pool.query(`
    SELECT z.zone_id, z.zone_name, z.zone_code,
           z.zone_price, z.zone_quantity, z.sold_quantity,
           z.zone_description,
           e.event_id, e.event_name
    FROM zones z
    JOIN events e ON z.event_id = e.event_id
  `);

  for (const z of zones.rows) {
    const available = z.zone_quantity - z.sold_quantity;

    docs.push(
      new Document({
        pageContent: `
Sự kiện: ${z.event_name}
Event ID: ${z.event_id}
Khu vực vé: ${z.zone_name}
Zone ID: ${z.zone_id}
Mã khu vực: ${z.zone_code}
Mô tả: ${z.zone_description || "Không có mô tả"}
Giá vé: ${formatCurrency(z.zone_price)}
Tổng số vé: ${z.zone_quantity.toLocaleString()}
Trạng thái: ${available > 0 ? "Còn vé" : "Hết vé"}
        `.trim(),
        metadata: {
          source_type: "zone",
          source_id: z.zone_id,
          zone_id: z.zone_id,         // ← Zone ID số
          zone_code: z.zone_code,
          event_id: z.event_id,       // ← Event ID số
          title: `Vé ${z.zone_name} - ${z.event_name}`,
        },
      })
    );
  }

  return docs;
}

async function embedAndStore() {
  console.log("🔄 Bắt đầu embedding với LangChain...\n");

  await pool.query("DELETE FROM rag_documents");
  console.log("🗑️  Đã xóa dữ liệu cũ\n");

  const docs = await fetchDocuments();
  console.log(`📄 Tìm thấy ${docs.length} documents\n`);

  const vectorStore = await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: {
      connectionString: process.env.DATABASE_URL,
    },
    tableName: "rag_documents",
    columns: {
      idColumnName: "doc_id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "meta",
    },
  });

  const BATCH_SIZE = 5;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const titles = batch.map((d) => d.metadata.title || "unknown");
    console.log(`⚙️  Batch ${Math.floor(i / BATCH_SIZE) + 1}: [${titles.join(", ")}]`);

    await vectorStore.addDocuments(batch);

    if (i + BATCH_SIZE < docs.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log("\n✅ Embedding hoàn tất!");
  await pool.end();
}

embedAndStore().catch((err) => {
  console.error("❌ Lỗi:", err.message);
  pool.end();
  process.exit(1);
});