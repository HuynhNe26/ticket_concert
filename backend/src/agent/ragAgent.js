import "dotenv/config";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { pool } from "../config/database.js";
import { getDateContext, formatCurrency } from "../utils/helpers.js";
import { keyManager } from "./geminiKeyManager.js";

function createLLM() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: keyManager.getCurrentKey(),
    temperature: 0.2,
    maxOutputTokens: 1500,
  });
}

function createEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: keyManager.getCurrentKey(),
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: 2000,
  });
}

export let llm = createLLM();
export let embeddings = createEmbeddings();

/**
 * Wrapper gọi LLM với tự động fallback key khi lỗi.
 * Thử tối đa MAX_RETRIES lần, mỗi lần dùng key khác.
 *
 * @param {Function} fn - async function nhận (llmInstance) => result
 * @returns {Promise<*>}
 */
const MAX_RETRIES = 3;

export async function callWithKeyFallback(fn) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const currentLLM = createLLM();
    try {
      const result = await fn(currentLLM);
      keyManager.reportSuccess();
      return result;
    } catch (err) {
      lastError = err;
      const isRetryable = _isKeyError(err);

      console.warn(
        `[ragAgent] ⚠️ Attempt ${attempt}/${MAX_RETRIES} thất bại: ${err.message?.slice(0, 80)}`
      );

      if (!isRetryable || attempt === MAX_RETRIES) break;

      const newKey = keyManager.reportError(err);
      if (!newKey) {
        console.error("[ragAgent] ❌ Hết key khả dụng, dừng retry.");
        break;
      }

      // Cập nhật export llm cho các code khác tham chiếu
      llm = createLLM();
    }
  }

  throw lastError;
}

/**
 * Kiểm tra lỗi có phải do API key không (rate limit / quota).
 */
export function isKeyError(err) {
  const msg    = (err?.message || "").toLowerCase();
  const status = err?.status || err?.statusCode;
  return (
    status === 429 ||
    status === 403 ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted")
  );
}
const _isKeyError = isKeyError;

// ─────────────────────────────────────────────────────────────────────────────
// VECTOR STORE
// ─────────────────────────────────────────────────────────────────────────────

let vectorStore;
export async function getVectorStore() {
  if (vectorStore) return vectorStore;
  vectorStore = await PGVectorStore.initialize(createEmbeddings(), {
    postgresConnectionOptions: { connectionString: process.env.DATABASE_URL },
    tableName: "rag_documents",
    columns: {
      idColumnName:       "doc_id",
      vectorColumnName:   "embedding",
      contentColumnName:  "content",
      metadataColumnName: "meta",
    },
    distanceStrategy: "cosine",
  });
  return vectorStore;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 1: RAG Search
// ─────────────────────────────────────────────────────────────────────────────
export const ragSearchTool = tool(
  async ({ query, topK = 5 }) => {
    try {
      const store = await getVectorStore();
      const results = await store.similaritySearchWithScore(query, topK);

      // ✅ FIX: LangChain PGVector trả về Cosine Distance (<=>), giá trị nhỏ là tương đồng cao
      // Chuyển sang Cosine Similarity: similarity = 1 - distance
      const withSimilarity = results.map(([doc, distance]) => ({
        doc,
        distance,
        similarity: Math.max(0, 1 - distance),
      }));

      // Lọc các kết quả có độ tương đồng tốt (>= 60%)
      const filtered = withSimilarity.filter((r) => r.similarity >= 0.60);

      if (filtered.length === 0) {
        const keywords = query
          .split(/\s+/)
          .filter((w) => w.length > 2)
          .slice(0, 4);

        if (!keywords.length) return "⚠️ Không tìm thấy thông tin liên quan.";

        const conditions = keywords
          .map((_, i) => `e.event_name ILIKE $${i + 1}`)
          .join(" OR ");

        const dbResult = await pool.query(
          `SELECT e.event_id, e.event_name, e.event_location, e.event_start,
                  e.event_artist, c.category_name
           FROM events e
           JOIN categories c ON e.category_id = c.category_id
           WHERE ${conditions}
           LIMIT 3`,
          keywords.map((k) => `%${k}%`)
        );

        if (dbResult.rows.length > 0) {
          return (
            "📌 Tìm thấy qua keyword:\n" +
            dbResult.rows
              .map((ev) => {
                const artists =
                  ev.event_artist?.map((a) => a.name).join(", ") || "Chưa cập nhật";
                return `• ${ev.event_name} [ID:${ev.event_id}] — ${ev.event_location} | Nghệ sĩ: ${artists}`;
              })
              .join("\n")
          );
        }
        return "⚠️ Không tìm thấy thông tin liên quan. Hãy thử từ khóa khác.";
      }

      return filtered
        .map(({ doc, similarity }, i) => {
          const relevance = Math.round(similarity * 100);
          return `[Kết quả ${i + 1} — độ tương đồng ${relevance}%]\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
    } catch (err) {
      console.error("RAG search error:", err.message);
      return "❌ Lỗi khi tìm kiếm thông tin.";
    }
  },
  {
    name: "rag_search",
    description:
      "Tìm kiếm chi tiết về sự kiện, nghệ sĩ, giá vé trong knowledge base (vector store). " +
      "Dùng khi cần: thông tin nghệ sĩ, mô tả sự kiện cụ thể, điều khoản vé, " +
      "lịch sử sự kiện, hoặc khi get_events không đủ chi tiết.",
    schema: z.object({
      query: z.string().describe("Câu truy vấn tìm kiếm semantic"),
      topK:  z.number().optional().default(5).describe("Số lượng kết quả (mặc định 5)"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 2: Get Events
// ─────────────────────────────────────────────────────────────────────────────
export const getEventsTool = tool(
  async ({ filter, limit = 5 }) => {
    try {
      let query = `
        SELECT e.event_id, e.event_name, e.event_location,
               e.event_start, e.event_end, e.event_artist,
               e.event_status, c.category_name,
               MIN(z.zone_price) AS min_price,
               COUNT(z.zone_id) > 0                                     AS has_zones,
               COUNT(z.zone_id) FILTER (WHERE z.status = true) > 0      AS has_open_zones
        FROM events e
        JOIN categories c ON e.category_id = c.category_id
        LEFT JOIN zones z ON z.event_id = e.event_id
        WHERE 1=1
      `;
      const params = [];

      if (filter?.category) {
        params.push(`%${filter.category}%`);
        query += ` AND c.category_name ILIKE $${params.length}`;
      }
      if (filter?.eventName) {
        params.push(`%${filter.eventName}%`);
        query += ` AND e.event_name ILIKE $${params.length}`;
      }
      if (filter?.location) {
        params.push(`%${filter.location}%`);
        query += ` AND e.event_location ILIKE $${params.length}`;
      }
      if (filter?.artistName) {
        params.push(`%${filter.artistName}%`);
        query += ` AND e.event_artist::text ILIKE $${params.length}`;
      }

      if (filter?.maxPrice) {
        params.push(filter.maxPrice);
        query += ` AND z.zone_price <= $${params.length}`;
      }
      if (filter?.minPrice) {
        params.push(filter.minPrice);
        query += ` AND z.zone_price >= $${params.length}`;
      }
      if (filter?.onlyAvailable) {
        query += ` AND z.status = true AND (z.zone_quantity - z.sold_quantity) > 0`;
      }

      if (filter?.today) {
        query += ` AND e.event_end::date = CURRENT_DATE`;
      } else if (filter?.tomorrow) {
        query += ` AND e.event_end::date = (CURRENT_DATE + INTERVAL '1 day')::date`;
      } else if (filter?.specificDate) {
        params.push(filter.specificDate);
        query += ` AND e.event_end::date = $${params.length}::date`;
      } else if (filter?.upcoming) {
        query += ` AND e.event_start > NOW()`;
      } else if (filter?.thisMonth) {
        query += ` AND e.event_start <= DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'
                   AND e.event_end   >= DATE_TRUNC('month', NOW())`;
      } else if (filter?.active) {
        query += ` AND e.event_end >= NOW()`;
      }

      if (filter?.hot) {
        query += ` AND e.event_end >= NOW() AND z.status = true`;
      }

      query += ` GROUP BY e.event_id, c.category_name, c.category_id`;

      if (filter?.hot) {
        query += `
          HAVING SUM(z.zone_quantity) > 0
          ORDER BY
            ROUND(SUM(z.sold_quantity)::numeric / NULLIF(SUM(z.zone_quantity), 0) * 100, 1) DESC,
            SUM(z.sold_quantity) DESC,
            e.event_start ASC`;
      } else {
        query += ` ORDER BY e.event_start ASC`;
      }

      params.push(Math.min(limit, 10));
      query += ` LIMIT $${params.length}`;

      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        if (filter?.today)        return "ℹ️ Hôm nay không có sự kiện nào đang diễn ra.";
        if (filter?.tomorrow)     return "ℹ️ Ngày mai chưa có sự kiện nào được lên lịch.";
        if (filter?.specificDate) return `ℹ️ Không có sự kiện nào vào ngày ${filter.specificDate}.`;
        return "ℹ️ Không tìm thấy sự kiện phù hợp.";
      }

      const now          = new Date();
      const todayDate    = new Date(); todayDate.setHours(0, 0, 0, 0);
      const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);

      return result.rows
        .map((ev) => {
          const start    = new Date(ev.event_start);
          const end      = new Date(ev.event_end);
          const artists  = ev.event_artist?.map((a) => a.name).join(", ") || "Chưa cập nhật";
          const minPrice = ev.min_price ? formatCurrency(ev.min_price) : "Chưa cập nhật";

          let statusIcon;
          const startDate = new Date(start); startDate.setHours(0, 0, 0, 0);

          if (now > end) {
            statusIcon = "✅ Đã kết thúc";
          } else if (now >= start && now <= end) {
            statusIcon = "🔴 ĐANG DIỄN RA";
          } else if (startDate.getTime() === todayDate.getTime()) {
            statusIcon = "📌 HÔM NAY";
          } else if (startDate.getTime() === tomorrowDate.getTime()) {
            statusIcon = "📅 NGÀY MAI";
          } else {
            statusIcon = "📅 Sắp diễn ra";
          }

          // ── Trạng thái mở bán dựa trên has_open_zones / has_zones từ SQL
          let saleStatusStr;
          if (now > end) {
            saleStatusStr = "🔒 Đã đóng bán";
          } else if (ev.has_open_zones) {
            saleStatusStr = "🟢 Đang mở bán";
          } else if (ev.has_zones) {
            saleStatusStr = "⏳ Chưa mở bán vé";
          } else {
            saleStatusStr = "⏳ Chưa công bố vé";
          }

          const timeStr = (filter?.today || filter?.tomorrow || filter?.specificDate)
            ? `${start.toLocaleDateString("vi-VN")} lúc ${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
            : start.toLocaleDateString("vi-VN");

          return (
            `🎵 **${ev.event_name}** [ID:${ev.event_id}]\n` +
            `   📍 ${ev.event_location}\n` +
            `   🕐 ${timeStr} — ${statusIcon}\n` +
            `   🎟️ ${saleStatusStr} | 💰 Từ ${minPrice}\n` +
            `   🎤 ${artists}`
          );
        })
        .join("\n\n");
    } catch (err) {
      console.error("DB events error:", err.message);
      return "❌ Lỗi khi truy vấn danh sách sự kiện.";
    }
  },
  {
    name: "get_events",
    description:
      "Lấy danh sách sự kiện từ database với bộ lọc linh hoạt. " +
      "Dùng khi: hỏi sự kiện hôm nay, ngày mai, ngày cụ thể, tháng này, ở đâu, " +
      "sự kiện đang/sắp diễn ra, sự kiện của nghệ sĩ nào. " +
      "Trả về tối đa 10 sự kiện với giá vé và trạng thái.",
    schema: z.object({
      filter: z
        .object({
          category:      z.string().optional().describe("Tên thể loại"),
          eventName:     z.string().optional().describe("Tên sự kiện"),
          location:      z.string().optional().describe("Địa điểm tổ chức"),
          artistName:    z.string().optional().describe("Tên nghệ sĩ biểu diễn"),
          maxPrice:      z.number().optional().describe("Giá vé tối đa (VNĐ)"),
          minPrice:      z.number().optional().describe("Giá vé tối thiểu (VNĐ)"),
          onlyAvailable: z.boolean().optional().describe("true → chỉ lấy sự kiện còn vé đang mở bán"),
          today:         z.boolean().optional().describe("true → sự kiện diễn ra NGAY HÔM NAY"),
          tomorrow:      z.boolean().optional().describe("true → sự kiện diễn ra NGÀY MAI"),
          specificDate:  z.string().optional().describe("Ngày cụ thể định dạng YYYY-MM-DD"),
          upcoming:      z.boolean().optional().describe("Sự kiện chưa bắt đầu (event_start > NOW)"),
          thisMonth:     z.boolean().optional().describe("Sự kiện trong tháng hiện tại"),
          active:        z.boolean().optional().describe("Sự kiện chưa kết thúc (event_end >= NOW)"),
          hot:           z.boolean().optional().describe("Sắp xếp theo độ hot: tỉ lệ bán cao nhất"),
        })
        .optional(),
      limit: z.number().optional().default(10),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 3: Check Tickets
// ─────────────────────────────────────────────────────────────────────────────
export const checkTicketsTool = tool(
  async ({ eventName, eventId, zoneCode }) => {
    try {
      // ── Bước 1: Tìm sự kiện khớp tên (KHÔNG lọc theo event_status/event_end)
      // để có thể trả lời "chưa mở bán", "đã kết thúc", v.v.
      let eventQuery = `
        SELECT e.event_id, e.event_name, e.event_start, e.event_end, e.event_status
        FROM events e
        WHERE 1=1
      `;
      const eventParams = [];

      if (eventId) {
        eventParams.push(eventId);
        eventQuery += ` AND e.event_id = $${eventParams.length}`;
      } else if (eventName) {
        eventParams.push(`%${eventName}%`);
        eventQuery += ` AND e.event_name ILIKE $${eventParams.length}`;
      }
      eventQuery += ` ORDER BY e.event_start DESC LIMIT 5`;

      const eventResult = await pool.query(eventQuery, eventParams);

      if (eventResult.rows.length === 0)
        return "⚠️ Không tìm thấy sự kiện. Vui lòng kiểm tra lại tên sự kiện.";

      // ── Bước 2: Xác định trạng thái mở bán dựa trên event_start / event_end
      const now = new Date();
      const ev  = eventResult.rows[0];
      const start = new Date(ev.event_start);
      const end   = new Date(ev.event_end);

      const startStr = start.toLocaleDateString("vi-VN") +
        " lúc " + start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const endStr = end.toLocaleDateString("vi-VN") +
        " lúc " + end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

      // Sự kiện đã kết thúc
      if (now > end) {
        return (
          `🎵 **${ev.event_name}**\n` +
          `   🕐 Diễn ra: ${startStr} → ${endStr}\n` +
          `   ✅ Sự kiện đã **kết thúc** — không còn vé để bán.`
        );
      }

      // Sự kiện chưa bắt đầu → đang trong giai đoạn bán vé hoặc chưa mở bán
      // Kiểm tra zones xem có vé nào chưa
      let zoneQuery = `
        SELECT z.zone_id, z.zone_name, z.zone_code,
               z.zone_price, z.zone_quantity, z.sold_quantity,
               (z.zone_quantity - z.sold_quantity) AS available,
               z.status
        FROM zones z
        WHERE z.event_id = $1
      `;
      const zoneParams = [ev.event_id];

      if (zoneCode) {
        zoneParams.push(zoneCode.toUpperCase());
        zoneQuery += ` AND UPPER(z.zone_code) = $${zoneParams.length}`;
      }
      zoneQuery += ` ORDER BY z.zone_price ASC`;

      const zoneResult = await pool.query(zoneQuery, zoneParams);

      // Xác định nhãn trạng thái sự kiện
      let saleStatusLine;
      if (now >= start && now <= end) {
        saleStatusLine = `🔴 **Đang diễn ra** (${startStr} → ${endStr})`;
      } else {
        // now < start → sắp diễn ra
        const diffMs   = start - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs  = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const countdown =
          diffDays > 0 ? `còn **${diffDays} ngày ${diffHrs} giờ** nữa` : `còn **${diffHrs} giờ** nữa`;
        saleStatusLine = `📅 **Sắp diễn ra** — ${startStr} (${countdown})`;
      }

      const header =
        `🎫 **Thông tin vé: ${ev.event_name}**\n` +
        `   🕐 ${saleStatusLine}\n\n`;

      // Không có zone nào → chưa mở bán
      if (zoneResult.rows.length === 0) {
        return (
          header +
          `⚠️ **Chưa mở bán vé** — Sự kiện này chưa có thông tin vé được công bố.\n` +
          `   Bạn hãy theo dõi trang sự kiện để cập nhật khi vé mở bán nhé!`
        );
      }

      // Có zone → kiểm tra từng zone có đang bán không (z.status)
      const activeZones   = zoneResult.rows.filter((z) => z.status === true);
      const inactiveZones = zoneResult.rows.filter((z) => z.status !== true);

      let body = "";

      if (activeZones.length === 0 && inactiveZones.length > 0) {
        // Tất cả zone đều đóng → chưa mở bán
        body =
          `⚠️ **Chưa mở bán vé** — Vé sự kiện này chưa được kích hoạt bán.\n` +
          `   Các khu vực sẽ có khi mở bán:\n` +
          inactiveZones
            .map((z) => `   • **${z.zone_name}** (${z.zone_code}) — ${formatCurrency(z.zone_price)}`)
            .join("\n");
      } else {
        // Có ít nhất 1 zone đang mở bán
        const zoneLines = zoneResult.rows
          .map((z) => {
            if (!z.status) {
              return (
                `• **${z.zone_name}** (${z.zone_code})\n` +
                `  💰 ${formatCurrency(z.zone_price)} — 🔒 Chưa mở bán`
              );
            }
            const statusIcon =
              z.available <= 0  ? "❌ Hết vé" :
              z.available <= 20 ? `⚠️  Sắp hết (còn ${z.available})` :
                                  `✅ Còn vé (${z.available} vé)`;
            return (
              `• **${z.zone_name}** (${z.zone_code})\n` +
              `  💰 ${formatCurrency(z.zone_price)} — ${statusIcon}`
            );
          })
          .join("\n");
        body = `✅ **Vé đang được bán:**\n${zoneLines}`;
      }

      return header + body;
    } catch (err) {
      console.error("Ticket check error:", err.message);
      return "❌ Lỗi khi kiểm tra vé.";
    }
  },
  {
    name: "check_tickets",
    description:
      "Kiểm tra tình trạng vé của sự kiện: đã mở bán chưa, còn vé không, giá bao nhiêu, " +
      "khu vực nào còn/hết/chưa mở bán. Dùng cho CẢ sự kiện chưa diễn ra, đang diễn ra, " +
      "và câu hỏi 'sự kiện X mở bán chưa', 'vé X còn không', 'giá vé X'.",
    schema: z.object({
      eventName: z.string().optional().describe("Tên sự kiện (tìm gần đúng)"),
      eventId:   z.number().optional().describe("ID sự kiện (chính xác hơn eventName)"),
      zoneCode:  z.string().optional().describe("Mã khu vực: GA, VIP, VVIP, SUPER_FAN..."),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 4: Recommend Tickets (Gợi ý vé thông minh đa tiêu chí & thời gian thực)
// ─────────────────────────────────────────────────────────────────────────────
export const recommendTicketsTool = tool(
  async ({
    query,
    budget,
    minBudget,
    genre,
    artist,
    location,
    timeframe,
    zoneType,
    userId,
    limit = 5,
  }) => {
    try {
      // 1. Thu thập dữ liệu sở thích & lịch sử nếu có userId
      let userFavoriteKeywords = [];
      let userPurchasedArtists = [];
      let userPurchasedCategories = [];

      if (userId) {
        try {
          const [userRes, purchaseRes] = await Promise.all([
            pool.query(`SELECT favorite FROM users WHERE user_id = $1`, [userId]),
            pool.query(
              `SELECT DISTINCT e.category_id, c.category_name, e.event_artist
               FROM payments p
               JOIN payment_detail pd ON p.payment_id = pd.payment_id
               JOIN events e ON pd.event_id = e.event_id
               JOIN categories c ON e.category_id = c.category_id
               WHERE p.user_id = $1 AND (p.payment_status ILIKE '%thành công%' OR p.payment_status ILIKE '%success%')
               LIMIT 10`,
              [userId]
            ),
          ]);

          const favList = userRes.rows[0]?.favorite || [];
          userFavoriteKeywords = favList.map((f) => f?.search?.toLowerCase()?.trim()).filter(Boolean);

          userPurchasedCategories = purchaseRes.rows
            .map((r) => r.category_name?.toLowerCase()?.trim())
            .filter(Boolean);

          userPurchasedArtists = purchaseRes.rows
            .flatMap((r) => {
              const a = r.event_artist;
              if (Array.isArray(a)) return a.map((x) => (x?.name || x)?.toLowerCase()?.trim());
              return [];
            })
            .filter(Boolean);
        } catch (e) {
          console.warn("[recommendTicketsTool] Warning fetching user context:", e.message);
        }
      }

      // 2. Tìm kiếm ngữ nghĩa vector nếu có query mô tả cảm xúc/thể loại/nghệ sĩ
      const semanticEventIds = new Map(); // eventId -> similarity
      const searchQuery = query || genre || artist;
      if (searchQuery) {
        try {
          const store = await getVectorStore();
          const vectorResults = await store.similaritySearchWithScore(searchQuery, 8);
          for (const [doc, distance] of vectorResults) {
            const similarity = Math.max(0, 1 - distance);
            if (similarity >= 0.58) {
              const evId =
                doc.metadata?.event_id ??
                (() => {
                  const match = doc.pageContent.match(/\[ID[:\s]*(\d+)\]/i);
                  return match ? parseInt(match[1]) : null;
                })();
              if (evId) {
                const prevSim = semanticEventIds.get(evId) || 0;
                semanticEventIds.set(evId, Math.max(prevSim, similarity));
              }
            }
          }
        } catch (vErr) {
          console.warn("[recommendTicketsTool] Vector search fallback to SQL:", vErr.message);
        }
      }

      // 3. Truy vấn SQL: Chỉ lấy vé từ các sự kiện còn hạn và CÁC ZONE ĐANG MỞ BÁN CÒN VÉ THỰC TẾ
      let sql = `
        SELECT
          e.event_id,
          e.event_name,
          e.event_location,
          e.event_start,
          e.event_end,
          e.event_artist,
          c.category_name,
          z.zone_id,
          z.zone_name,
          z.zone_code,
          z.zone_price,
          z.zone_quantity,
          z.sold_quantity,
          (z.zone_quantity - z.sold_quantity) AS available_tickets,
          ROUND(z.sold_quantity::numeric / NULLIF(z.zone_quantity, 0) * 100, 1) AS sell_rate
        FROM events e
        JOIN categories c ON e.category_id = c.category_id
        JOIN zones z ON z.event_id = e.event_id
        WHERE e.event_status = true
          AND e.event_end >= NOW()
          AND z.status = true
          AND (z.zone_quantity - z.sold_quantity) > 0
      `;
      const params = [];

      if (budget) {
        params.push(budget);
        sql += ` AND z.zone_price <= $${params.length}`;
      }
      if (minBudget) {
        params.push(minBudget);
        sql += ` AND z.zone_price >= $${params.length}`;
      }
      if (location) {
        params.push(`%${location}%`);
        sql += ` AND e.event_location ILIKE $${params.length}`;
      }
      if (genre) {
        params.push(`%${genre}%`);
        sql += ` AND c.category_name ILIKE $${params.length}`;
      }
      if (artist) {
        params.push(`%${artist}%`);
        sql += ` AND e.event_artist::text ILIKE $${params.length}`;
      }
      if (zoneType) {
        params.push(`%${zoneType}%`);
        sql += ` AND (z.zone_name ILIKE $${params.length} OR z.zone_code ILIKE $${params.length})`;
      }

      // Lọc timeframe
      if (timeframe === "today") {
        sql += ` AND e.event_end::date = CURRENT_DATE`;
      } else if (timeframe === "tomorrow") {
        sql += ` AND e.event_end::date = (CURRENT_DATE + INTERVAL '1 day')::date`;
      } else if (timeframe === "this_weekend") {
        sql += ` AND EXTRACT(ISODOW FROM e.event_start) IN (5, 6, 7)
                 AND e.event_start <= (NOW() + INTERVAL '7 days')`;
      } else if (timeframe === "this_month") {
        sql += ` AND e.event_start <= DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'
                 AND e.event_end   >= DATE_TRUNC('month', NOW())`;
      } else if (timeframe === "upcoming") {
        sql += ` AND e.event_start > NOW()`;
      }

      sql += ` ORDER BY e.event_start ASC, z.zone_price ASC LIMIT 40`;

      const result = await pool.query(sql, params);

      // Nếu không có kết quả với bộ lọc ngặt nghèo, nới lỏng ngân sách để gợi ý các mức vé hiện có
      let candidateRows = result.rows;
      let relaxedNote = "";

      if (candidateRows.length === 0 && (budget || minBudget || zoneType)) {
        const fallbackSql = `
          SELECT
            e.event_id, e.event_name, e.event_location, e.event_start, e.event_end,
            e.event_artist, c.category_name, z.zone_id, z.zone_name, z.zone_code,
            z.zone_price, z.zone_quantity, z.sold_quantity,
            (z.zone_quantity - z.sold_quantity) AS available_tickets,
            ROUND(z.sold_quantity::numeric / NULLIF(z.zone_quantity, 0) * 100, 1) AS sell_rate
          FROM events e
          JOIN categories c ON e.category_id = c.category_id
          JOIN zones z ON z.event_id = e.event_id
          WHERE e.event_status = true
            AND e.event_end >= NOW()
            AND z.status = true
            AND (z.zone_quantity - z.sold_quantity) > 0
          ORDER BY z.zone_price ASC, e.event_start ASC
          LIMIT 20
        `;
        const fallbackRes = await pool.query(fallbackSql);
        if (fallbackRes.rows.length > 0) {
          candidateRows = fallbackRes.rows;
          relaxedNote = "*(Lưu ý: Không tìm thấy vé khớp hoàn toàn mức giá/khu vực bạn yêu cầu, mình gợi ý các mức vé hiện có sẵn gần nhất bên dưới)*\n\n";
        }
      }

      if (candidateRows.length === 0) {
        return (
          "ℹ️ Hiện tại không tìm thấy vé nào phù hợp với yêu cầu của bạn. " +
          "Bạn có thể thử nới lỏng mức giá hoặc chọn thời gian khác nhé!"
        );
      }

      // 4. Gom nhóm theo event_id để mỗi event gợi ý các zone tốt nhất
      const eventGroups = new Map();
      for (const row of candidateRows) {
        if (!eventGroups.has(row.event_id)) {
          eventGroups.set(row.event_id, {
            event_id: row.event_id,
            event_name: row.event_name,
            event_location: row.event_location,
            event_start: row.event_start,
            event_end: row.event_end,
            event_artist: row.event_artist,
            category_name: row.category_name,
            zones: [],
          });
        }
        eventGroups.get(row.event_id).zones.push({
          zone_id: row.zone_id,
          zone_name: row.zone_name,
          zone_code: row.zone_code,
          zone_price: Number(row.zone_price),
          available: Number(row.available_tickets),
          sell_rate: Number(row.sell_rate || 0),
        });
      }

      // 5. Chấm điểm sự kiện dựa trên vector semantic, sở thích user, budget, và độ hot
      const scoredEvents = [];

      for (const ev of eventGroups.values()) {
        let score = 1.0;
        const reasons = [];

        // Kiểm tra vector similarity
        const semSim = semanticEventIds.get(ev.event_id) || 0;
        if (semSim > 0.6) {
          score += semSim * 2.0;
          reasons.push("Đúng chủ đề/thể loại bạn quan tâm");
        }

        // Kiểm tra sở thích user
        const evArtists = Array.isArray(ev.event_artist)
          ? ev.event_artist.map((a) => (a?.name || a)?.toLowerCase())
          : [];
        const evCat = ev.category_name?.toLowerCase();
        const evName = ev.event_name?.toLowerCase();

        const artistMatch = evArtists.some((a) =>
          userFavoriteKeywords.some((kw) => a.includes(kw)) ||
          userPurchasedArtists.some((pa) => a.includes(pa))
        );
        if (artistMatch) {
          score += 2.5;
          reasons.push("Nghệ sĩ bạn yêu thích");
        }

        const categoryMatch =
          userFavoriteKeywords.some((kw) => evCat.includes(kw) || evName.includes(kw)) ||
          userPurchasedCategories.some((pc) => evCat.includes(pc));
        if (categoryMatch) {
          score += 1.5;
          reasons.push(`Thuộc thể loại ${ev.category_name} quen thuộc`);
        }

        // Đánh giá zone tốt nhất trong event theo budget
        let bestZone = null;
        if (budget) {
          const inBudgetZones = ev.zones.filter((z) => z.zone_price <= budget);
          if (inBudgetZones.length > 0) {
            inBudgetZones.sort((a, b) => b.zone_price - a.zone_price);
            bestZone = inBudgetZones[0];
            reasons.push(`Giá vé ${formatCurrency(bestZone.zone_price)} nằm trọn trong ngân sách`);
            score += 1.8;
          }
        }
        if (!bestZone) {
          ev.zones.sort((a, b) => a.zone_price - b.zone_price);
          bestZone = ev.zones[0];
          reasons.push(`Giá khởi điểm cực tốt chỉ từ ${formatCurrency(bestZone.zone_price)}`);
        }

        // Độ hot
        const maxSellRate = Math.max(...ev.zones.map((z) => z.sell_rate));
        if (maxSellRate > 70) {
          score += 0.8;
          reasons.push("Sự kiện đang rất HOT");
        }

        scoredEvents.push({
          ...ev,
          bestZone,
          score,
          reasons: [...new Set(reasons)],
        });
      }

      // Sắp xếp theo score giảm dần
      scoredEvents.sort((a, b) => b.score - a.score);
      const topEvents = scoredEvents.slice(0, Math.min(limit, 5));

      // 6. Định dạng câu trả lời trực quan
      const itemsFormatted = topEvents.map((ev, index) => {
        const start = new Date(ev.event_start);
        const timeStr = `${start.toLocaleDateString("vi-VN")} lúc ${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
        const artists = ev.event_artist?.map((a) => a.name || a).join(", ") || "Chưa cập nhật";

        const bz = ev.bestZone;
        const urgencyIcon = bz.available <= 20 ? "⚠️ Sắp hết vé!" : "✅ Còn vé";
        const zoneDetails = `**${bz.zone_name}** (${bz.zone_code}) — **${formatCurrency(bz.zone_price)}** (${urgencyIcon}, còn ${bz.available} vé)`;

        const otherZones = ev.zones.filter((z) => z.zone_id !== bz.zone_id);
        const otherZonesText = otherZones.length > 0
          ? `   *Khu vực khác:* ` + otherZones.slice(0, 3).map((z) => `${z.zone_name} (${formatCurrency(z.zone_price)})`).join(" | ")
          : "";

        const reasonStr = ev.reasons.length > 0
          ? `   💡 *Lý do gợi ý:* ${ev.reasons.join(" • ")}`
          : "";

        return (
          `🎟️ **Gợi ý ${index + 1}: ${ev.event_name}** [ID:${ev.event_id}]\n` +
          `   🎤 **Nghệ sĩ:** ${artists} | 🎵 **Thể loại:** ${ev.category_name}\n` +
          `   📍 **Địa điểm:** ${ev.event_location}\n` +
          `   🕐 **Thời gian:** ${timeStr}\n` +
          `   💺 **Hạng vé đề xuất:** ${zoneDetails}\n` +
          (otherZonesText ? `${otherZonesText}\n` : "") +
          (reasonStr ? `${reasonStr}\n` : "")
        );
      });

      return (
        relaxedNote +
        `🎯 **GỢI Ý VÉ DÀNH CHO BẠN:**\n\n` +
        itemsFormatted.join("\n\n") +
        `\n\n👉 *Để đặt vé, bạn chỉ cần vào sự kiện tương ứng, chọn khu vực vé mong muốn và tiến hành thanh toán nhé!*`
      );
    } catch (err) {
      console.error("recommendTicketsTool error:", err);
      return "❌ Lỗi khi phân tích gợi ý vé: " + err.message;
    }
  },
  {
    name: "recommend_tickets",
    description:
      "GỢI Ý VÉ VÀ HẠNG VÉ THÔNG MINH ĐA TIÊU CHÍ cho người dùng. " +
      "Dùng khi người dùng: " +
      "1. Hỏi gợi ý vé, tư vấn vé nên mua, nên chọn vé nào. " +
      "2. Có yêu cầu ngân sách cụ thể (vd: 'vé dưới 1 triệu', 'tầm 500k-800k', 'vé giá rẻ'). " +
      "3. Hỏi vé theo thể loại nhạc (Pop, Rock, Rap, Ballad, EDM...), nghệ sĩ, địa điểm hoặc thời gian (hôm nay, ngày mai, cuối tuần). " +
      "4. Hỏi gợi ý vé cá nhân hóa theo sở thích hoặc lịch sử (kết hợp userId). " +
      "Tool sẽ tự động lọc vé THỰC TẾ CÒN MỞ BÁN và tính toán khu vực vé tối ưu nhất.",
    schema: z.object({
      query: z.string().optional().describe("Mô tả nhu cầu vé bằng ngôn ngữ tự nhiên (vd: 'nhạc quẩy sôi động', 'ballad nhẹ nhàng')"),
      budget: z.number().optional().describe("Ngân sách tối đa của người dùng cho mỗi vé (VNĐ)"),
      minBudget: z.number().optional().describe("Ngân sách tối thiểu cho mỗi vé (VNĐ)"),
      genre: z.string().optional().describe("Thể loại âm nhạc (Pop, Rock, Rap, EDM, Ballad,...)"),
      artist: z.string().optional().describe("Tên nghệ sĩ hoặc nhóm nhạc mong muốn"),
      location: z.string().optional().describe("Địa điểm mong muốn (Hồ Chí Minh, Hà Nội,...)"),
      timeframe: z.enum(["today", "tomorrow", "this_weekend", "this_month", "upcoming"]).optional().describe("Khoảng thời gian muốn đi xem"),
      zoneType: z.string().optional().describe("Loại khu vực vé mong muốn (VIP, GA, Seated, Standing...)"),
      userId: z.number().optional().describe("ID người dùng nếu đã đăng nhập để cá nhân hóa"),
      limit: z.number().optional().default(5).describe("Số lượng vé gợi ý trả về (mặc định 5)"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 5: Personalized Events
// ─────────────────────────────────────────────────────────────────────────────
export const getPersonalizedEventsTool = tool(
  async ({ userId }) => {
    try {
      const [userResult, purchaseResult] = await Promise.all([
        pool.query(`SELECT favorite FROM users WHERE user_id = $1`, [userId]),
        pool.query(
          `SELECT DISTINCT e.category_id, c.category_name, e.event_artist
           FROM payments p
           JOIN payment_detail pd ON p.payment_id = pd.payment_id
           JOIN events e ON pd.event_id = e.event_id
           JOIN categories c ON e.category_id = c.category_id
           WHERE p.user_id = $1 AND (p.payment_status ILIKE '%thành công%' OR p.payment_status ILIKE '%success%')
           LIMIT 10`,
          [userId]
        ),
      ]);

      if (userResult.rows.length === 0)
        return "⚠️ Không tìm thấy người dùng.";

      const favorite = userResult.rows[0].favorite || [];
      const purchasedEvents = purchaseResult.rows || [];

      // Lấy từ khóa từ favorite
      const favoriteKeywords = favorite.map((item) => item?.search?.trim()).filter(Boolean);

      // Lấy thể loại và nghệ sĩ từ lịch sử mua vé
      const purchasedCategories = [...new Set(purchasedEvents.map((e) => e.category_name).filter(Boolean))];
      const purchasedArtists = [
        ...new Set(
          purchasedEvents.flatMap((e) => {
            const a = e.event_artist;
            if (Array.isArray(a)) return a.map((x) => (x?.name || x)?.trim()).filter(Boolean);
            return [];
          })
        ),
      ];

      const allKeywords = [...new Set([...favoriteKeywords, ...purchasedCategories, ...purchasedArtists])];

      // ── Chưa có sở thích hoặc lịch sử mua → fallback sự kiện HOT đang mở bán
      if (allKeywords.length === 0) {
        const fallback = await pool.query(`
          SELECT e.event_id, e.event_name, e.event_location,
                 e.event_start, e.event_artist, c.category_name,
                 MIN(z.zone_price) AS min_price,
                 SUM(z.zone_quantity - z.sold_quantity) AS available_tickets,
                 ROUND(
                   SUM(z.sold_quantity)::numeric / NULLIF(SUM(z.zone_quantity), 0) * 100, 1
                 ) AS sell_rate
          FROM events e
          JOIN categories c ON e.category_id = c.category_id
          LEFT JOIN zones z ON z.event_id = e.event_id AND z.status = true
          WHERE e.event_status = true AND e.event_end >= NOW()
          GROUP BY e.event_id, c.category_name
          HAVING SUM(z.zone_quantity) > 0
          ORDER BY sell_rate DESC, SUM(z.sold_quantity) DESC, e.event_start ASC
          LIMIT 6
        `);

        if (fallback.rows.length === 0) {
          return "ℹ️ Hiện chưa có sự kiện nào đang mở bán vé.";
        }

        const lines = fallback.rows.map((ev, i) => {
          const start = new Date(ev.event_start).toLocaleDateString("vi-VN");
          const artists = ev.event_artist?.map((a) => a.name || a).join(", ") || "Chưa cập nhật";
          const minPrice = ev.min_price ? formatCurrency(ev.min_price) : "Chưa cập nhật";
          const tickets = ev.available_tickets > 0 ? `Còn ${ev.available_tickets} vé` : "Đang kiểm tra";
          return (
            `🔥 **${i + 1}. ${ev.event_name}** [ID:${ev.event_id}]\n` +
            `   🎤 ${artists} | 🎵 ${ev.category_name}\n` +
            `   📍 ${ev.event_location} | 📅 ${start}\n` +
            `   💰 Từ **${minPrice}** | 🎟️ ${tickets}`
          );
        });

        return (
          `🌟 **Sự kiện HOT đề xuất cho bạn** *(bạn chưa lưu sở thích cụ thể)*:\n\n` +
          lines.join("\n\n")
        );
      }

      // ── Có sở thích / lịch sử → tìm theo keyword + bổ sung hot nếu thiếu
      const conditions = allKeywords
        .map((_, i) => `(
          e.event_name         ILIKE $${i + 1} OR
          c.category_name      ILIKE $${i + 1} OR
          e.event_artist::text ILIKE $${i + 1}
        )`)
        .join(" OR ");
      const params = allKeywords.map((k) => `%${k}%`);

      const result = await pool.query(
        `SELECT DISTINCT e.event_id, e.event_name, e.event_location,
                e.event_start, e.event_artist, c.category_name,
                MIN(z.zone_price) AS min_price,
                SUM(z.zone_quantity - z.sold_quantity) AS available_tickets
         FROM events e
         JOIN categories c ON e.category_id = c.category_id
         LEFT JOIN zones z ON z.event_id = e.event_id AND z.status = true
         WHERE e.event_status = true AND e.event_end >= NOW() AND (${conditions})
         GROUP BY e.event_id, c.category_name
         ORDER BY e.event_start ASC
         LIMIT 6`,
        params
      );

      let matchedEvents = result.rows;
      let extra = [];

      if (matchedEvents.length < 4) {
        const existingIds = matchedEvents.map((r) => r.event_id);
        const excludeClause = existingIds.length
          ? `AND e.event_id NOT IN (${existingIds.map((_, i) => `$${i + 1}`).join(",")})`
          : "";
        const hotResult = await pool.query(
          `SELECT e.event_id, e.event_name, e.event_location,
                  e.event_start, e.event_artist, c.category_name,
                  MIN(z.zone_price) AS min_price,
                  SUM(z.zone_quantity - z.sold_quantity) AS available_tickets
           FROM events e
           JOIN categories c ON e.category_id = c.category_id
           LEFT JOIN zones z ON z.event_id = e.event_id AND z.status = true
           WHERE e.event_status = true AND e.event_end >= NOW() ${excludeClause}
           GROUP BY e.event_id, c.category_name
           HAVING SUM(z.zone_quantity) > 0
           ORDER BY SUM(z.sold_quantity) DESC, e.event_start ASC
           LIMIT ${4 - matchedEvents.length}`,
          existingIds
        );
        extra = hotResult.rows;
      }

      const allList = [
        ...matchedEvents.map((ev) => ({ ...ev, isPersonal: true })),
        ...extra.map((ev) => ({ ...ev, isPersonal: false })),
      ];

      const formatted = allList.map((ev, i) => {
        const start = new Date(ev.event_start).toLocaleDateString("vi-VN");
        const artists = ev.event_artist?.map((a) => a.name || a).join(", ") || "Chưa cập nhật";
        const minPrice = ev.min_price ? formatCurrency(ev.min_price) : "Chưa cập nhật";
        const tag = ev.isPersonal ? "⭐ [HỢP SỞ THÍCH]" : "🔥 [SỰ KIỆN HOT]";
        const tickets = ev.available_tickets > 0 ? `Còn ${ev.available_tickets} vé` : "Đang kiểm tra";
        return (
          `${tag} **${i + 1}. ${ev.event_name}** [ID:${ev.event_id}]\n` +
          `   🎤 ${artists} | 🎵 ${ev.category_name}\n` +
          `   📍 ${ev.event_location} | 📅 ${start}\n` +
          `   💰 Giá từ **${minPrice}** | 🎟️ ${tickets}`
        );
      });

      const matchedTags = allKeywords.slice(0, 4).join(", ");
      return (
        `✨ **GỢI Ý CÁ NHÂN HÓA DỰA TRÊN SỞ THÍCH CỦA BẠN** (${matchedTags}):\n\n` +
        formatted.join("\n\n")
      );
    } catch (err) {
      console.error("Personalized events error:", err.message);
      return "❌ Lỗi khi lấy gợi ý sự kiện cá nhân hóa.";
    }
  },
  {
    name: "get_personalized_events",
    description:
      "Gợi ý sự kiện cá nhân hóa theo lịch sử mua vé & sở thích của user đã đăng nhập. " +
      "Trả về danh sách sự kiện phù hợp nhất kèm thông tin giá vé và tình trạng vé. " +
      "CHỈ dùng khi user đã đăng nhập (có userId).",
    schema: z.object({
      userId: z.number().describe("ID người dùng (lấy từ AUTH context)"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 5: Web Search
// ─────────────────────────────────────────────────────────────────────────────
export const webSearchTool = tool(
  async ({ query }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) return "⚠️ Web search chưa được cấu hình.";

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          max_results: 3,
          include_answer: true,
        }),
      });

      const data = await response.json();
      if (data.answer) return `🌐 Kết quả tìm kiếm:\n${data.answer}`;

      const results = (data.results || [])
        .slice(0, 3)
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.content?.slice(0, 250)}`)
        .join("\n\n");
      return results || "⚠️ Không tìm thấy kết quả.";
    } catch (err) {
      console.error("Web search error:", err.message);
      return "❌ Lỗi khi tìm kiếm.";
    }
  },
  {
    name: "web_search",
    description:
      "Tìm kiếm thông tin ngoài hệ thống. CHỈ dùng khi rag_search và get_events không có thông tin.",
    schema: z.object({
      query: z.string().describe("Từ khóa tìm kiếm tiếng Việt hoặc tiếng Anh"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 6: Get Orders
// ─────────────────────────────────────────────────────────────────────────────
export const getOrdersTool = tool(
  async ({ userId, status, paymentId, limit = 5 }) => {
    try {
      let query = `
        SELECT
          p.payment_id,
          p.payment_status,
          p.method,
          p.payment_ref,
          p.created_at,
          json_agg(
            json_build_object(
              'event_name',      e.event_name,
              'event_start',     e.event_start,
              'event_location',  e.event_location,
              'zone_name',       z.zone_name,
              'zone_code',       z.zone_code,
              'ticket_quantity', pd.ticket_quantity,
              'price',           pd.price,
              'total_price',     pd.total_price,
              'ticket_status',   pd.ticket_status
            )
            ORDER BY e.event_start ASC
          ) AS items,
          SUM(pd.total_price) AS grand_total
        FROM payments p
        JOIN payment_detail pd ON pd.payment_id = p.payment_id
        JOIN zones z           ON z.zone_id     = pd.zone_id
        JOIN events e          ON e.event_id    = pd.event_id
        WHERE p.user_id = $1
      `;
      const params = [userId];

      if (paymentId) {
        params.push(paymentId);
        query += ` AND p.payment_id = $${params.length}`;
      } else if (status) {
        if (status === "success") {
          query += ` AND (p.payment_status ILIKE '%thành công%' OR p.payment_status ILIKE '%success%')`;
        } else if (status === "pending") {
          query += ` AND (p.payment_status ILIKE '%chờ%' OR p.payment_status ILIKE '%pending%')`;
        } else if (status === "failed") {
          query += ` AND (p.payment_status ILIKE '%thất bại%' OR p.payment_status ILIKE '%failed%')`;
        } else if (status === "cancelled") {
          query += ` AND (p.payment_status ILIKE '%huỷ%' OR p.payment_status ILIKE '%cancelled%')`;
        } else if (status === "refunded") {
          query += ` AND (p.payment_status ILIKE '%hoàn%' OR p.payment_status ILIKE '%refunded%')`;
        } else {
          params.push(status);
          query += ` AND p.payment_status = $${params.length}`;
        }
      }

      query += ` GROUP BY p.payment_id`;
      query += ` ORDER BY p.created_at DESC`;
      params.push(Math.min(limit, 10));
      query += ` LIMIT $${params.length}`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        if (paymentId) return `ℹ️ Không tìm thấy đơn hàng #${paymentId}.`;
        if (status)    return `ℹ️ Bạn chưa có đơn hàng nào ở trạng thái "${status}".`;
        return "ℹ️ Bạn chưa có đơn hàng nào.";
      }

      const STATUS_LABEL = {
        pending:   "⏳ Chờ thanh toán",
        success:   "✅ Đã thanh toán",
        failed:    "❌ Thất bại",
        cancelled: "🚫 Đã huỷ",
        refunded:  "↩️ Đã hoàn tiền",
      };

      return result.rows
        .map((p) => {
          const statusLabel = STATUS_LABEL[p.payment_status] ?? p.payment_status;
          const orderDate   = new Date(p.created_at).toLocaleDateString("vi-VN");

          const itemLines = (p.items || [])
            .map((it) => {
              const eventDate  = new Date(it.event_start).toLocaleDateString("vi-VN");
              const ticketIcon = it.ticket_status ? "🎫" : "⚠️";
              return (
                `   ${ticketIcon} ${it.event_name} (${eventDate})\n` +
                `      📍 ${it.event_location}\n` +
                `      💺 ${it.zone_name} (${it.zone_code}) × ${it.ticket_quantity} — ${formatCurrency(it.total_price)}`
              );
            })
            .join("\n");

          return (
            `🧾 **Đơn #${p.payment_id}** — ${statusLabel}\n` +
            `   📅 Đặt ngày: ${orderDate} | 💳 ${p.method}\n` +
            `${itemLines}\n` +
            `   💰 Tổng: **${formatCurrency(p.grand_total)}**`
          );
        })
        .join("\n\n");
    } catch (err) {
      console.error("Get orders error:", err.message);
      return "❌ Lỗi khi truy vấn đơn hàng.";
    }
  },
  {
    name: "get_orders",
    description:
      "Xem lịch sử & chi tiết đơn hàng/thanh toán của user đã đăng nhập.",
    schema: z.object({
      userId:    z.number().describe("ID người dùng từ AUTH context"),
      status:    z
        .enum(["pending", "success", "failed", "cancelled", "refunded"])
        .optional()
        .describe("Lọc theo trạng thái thanh toán"),
      paymentId: z.number().optional().describe("Xem chi tiết 1 đơn cụ thể theo payment_id"),
      limit:     z.number().optional().default(5).describe("Số đơn trả về (mặc định 5, tối đa 10)"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 7: Get Membership — xem hạng thành viên & điểm tích lũy
// ─────────────────────────────────────────────────────────────────────────────
export const getMembershipTool = tool(
  async ({ userId }) => {
    try {
      const result = await pool.query(
        `SELECT m.membership_id, m.tier, m.points, m.joined_at,
                u.full_name, u.email
         FROM memberships m
         JOIN users u ON u.user_id = m.user_id
         WHERE m.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return JSON.stringify({
          success: false,
          message: "Bạn chưa có thông tin thành viên. Hãy mua vé để bắt đầu tích điểm!",
        });
      }

      const m = result.rows[0];

      // Định nghĩa hạng & quyền lợi
      const TIER_INFO = {
        bronze: {
          icon:    "🥉",
          label:   "Đồng",
          nextTier: "Bạc",
          pointsNeeded: 500,
          benefits: ["Ưu tiên mua vé sớm hơn 30 phút", "Giảm 2% phí dịch vụ"],
        },
        silver: {
          icon:    "🥈",
          label:   "Bạc",
          nextTier: "Vàng",
          pointsNeeded: 2000,
          benefits: ["Ưu tiên mua vé sớm 1 giờ", "Giảm 5% phí dịch vụ", "Hoàn tiền 1% mỗi đơn"],
        },
        gold: {
          icon:    "🥇",
          label:   "Vàng",
          nextTier: "Bạch Kim",
          pointsNeeded: 5000,
          benefits: ["Ưu tiên mua vé sớm 3 giờ", "Giảm 8% phí dịch vụ", "Hoàn tiền 2% mỗi đơn", "Hỗ trợ ưu tiên"],
        },
        platinum: {
          icon:    "💎",
          label:   "Bạch Kim",
          nextTier: null,
          pointsNeeded: null,
          benefits: ["Ưu tiên mua vé sớm 6 giờ", "Giảm 12% phí dịch vụ", "Hoàn tiền 3% mỗi đơn", "Hỗ trợ VIP 24/7", "Tặng vé sự kiện đặc biệt"],
        },
      };

      const tierKey  = m.tier?.toLowerCase() ?? "bronze";
      const tierData = TIER_INFO[tierKey] ?? TIER_INFO.bronze;
      const joinedAt = new Date(m.joined_at).toLocaleDateString("vi-VN");

      const progressLine = tierData.pointsNeeded
        ? `📈 Cần thêm **${Math.max(0, tierData.pointsNeeded - m.points)} điểm** để lên hạng **${tierData.nextTier}**`
        : `🏆 Bạn đang ở hạng cao nhất!`;

      const benefitLines = tierData.benefits.map((b) => `  ✔ ${b}`).join("\n");

      return JSON.stringify({
        success: true,
        membership: {
          tier:         tierData.label,
          icon:         tierData.icon,
          points:       m.points,
          joinedAt,
          nextTier:     tierData.nextTier,
          pointsNeeded: tierData.pointsNeeded,
          benefits:     tierData.benefits,
        },
        formatted:
          `${tierData.icon} **Thành viên ${tierData.label}** — ${m.full_name}\n` +
          `   🎯 Điểm tích lũy: **${m.points} điểm**\n` +
          `   📅 Tham gia từ: ${joinedAt}\n` +
          `   ${progressLine}\n\n` +
          `**Quyền lợi của bạn:**\n${benefitLines}`,
      });
    } catch (err) {
      console.error("Get membership error:", err.message);
      return JSON.stringify({ success: false, message: "Lỗi khi truy vấn thông tin thành viên." });
    }
  },
  {
    name: "get_membership",
    description:
      "Xem hạng thành viên, điểm tích lũy và quyền lợi của user đã đăng nhập. " +
      "Dùng khi user hỏi: 'hạng thành viên của tôi', 'tôi có bao nhiêu điểm', " +
      "'quyền lợi thành viên', 'tôi đang ở hạng gì', 'còn bao nhiêu điểm lên hạng', " +
      "'membership của tôi', 'tài khoản của tôi'. " +
      "CHỈ dùng khi user đã đăng nhập (có userId).",
    schema: z.object({
      userId: z.number().describe("ID người dùng từ AUTH context"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
export function buildSystemPrompt() {
  const today = getDateContext();

  return `
Bạn là trợ lý AI thông minh của nền tảng đặt vé sự kiện âm nhạc.
Hôm nay: **${today}**

## AUTH CONTEXT (đọc từ đầu mỗi tin nhắn)
- [AUTH:userId=X] → user ĐÃ đăng nhập, userId = X
- [AUTH:guest]    → user CHƯA đăng nhập

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## QUY TRÌNH XỬ LÝ (BẮT BUỘC TUÂN THEO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🔍 BƯỚC 1 — PHÂN LOẠI CÂU HỎI
| Nhóm | Dấu hiệu nhận biết |
|---|---|
| **ticket_recommendation** | "gợi ý vé", "tư vấn vé", "vé dưới X đồng", "nên mua vé nào", "có vé nào giá rẻ", "vé concert nào phù hợp", "vé tầm 500k-1tr" |
| **event_list** | "sự kiện tháng này", "có những show nào", "sự kiện ở HCM" |
| **event_date** | "hôm nay", "tối nay", "ngày mai", "tối mai", "ngày 25/12", "thứ Bảy này" |
| **event_detail** | tên sự kiện cụ thể, hỏi chi tiết về 1 show |
| **ticket_check** | "còn vé không", "giá vé", "vé VIP", "vé GA", "mở bán chưa", "đã mở bán chưa", "bao giờ mở bán", "khi nào bán vé" |
| **artist_info** | hỏi về nghệ sĩ, ca sĩ, ban nhạc |
| **recommend_guest** | "gợi ý sự kiện" + [AUTH:guest], "nên xem gì", "sự kiện hot", "sự kiện nổi bật" |
| **personalized** | "gợi ý cho mình", "theo sở thích", "phù hợp với tôi" + [AUTH:userId=X] |
| **purchase** | "mua vé", "đặt vé", "thanh toán" |
| **history** | "vé của tôi", "lịch sử mua", "đã mua" |
| **out_of_scope** | không liên quan âm nhạc/vé |

### 📅 BƯỚC 2 — PARSE THỜI GIAN & NGÂN SÁCH TỪ NGÔN NGỮ TỰ NHIÊN
- **Thời gian**:
  - "hôm nay", "tối nay" → \`today\`
  - "ngày mai", "tối mai" → \`tomorrow\`
  - "cuối tuần này", "thứ Bảy", "Chủ Nhật" → \`this_weekend\`
  - "tháng này" → \`this_month\`
- **Ngân sách (VNĐ)**:
  - "500k" / "năm trăm ngàn" → \`budget: 500000\`
  - "1tr" / "1 triệu" / "1 củ" → \`budget: 1000000\`
  - "2tr5" / "2 triệu rưỡi" → \`budget: 2500000\`
  - "dưới 800k" → \`budget: 800000\`
  - "từ 500k đến 1tr" → \`minBudget: 500000, budget: 1000000\`

### ❓ BƯỚC 3 — KIỂM TRA THÔNG TIN ĐỦ CHƯA
- **ticket_recommendation** → LUÔN ĐỦ thông tin, gọi tool \`recommend_tickets\` ngay
- **ticket_check** (gồm cả 'mở bán chưa', 'còn vé không') mà THIẾU tên sự kiện → Hỏi: "Bạn muốn kiểm tra vé sự kiện nào?"
- **event_detail** mà tên mơ hồ → Hỏi xác nhận tên
- **event_date** → LUÔN ĐỦ thông tin, gọi tool ngay
- **event_list** → LUÔN ĐỦ thông tin, gọi tool ngay

### 🔧 BƯỚC 4 — CHỌN CÔNG CỤ PHÙ HỢP
| Nhóm | Công cụ chính | Ghi chú |
|---|---|---|
| **ticket_recommendation** | **recommend_tickets** | Tự động phân tích ngân sách, hạng vé tối ưu, tình trạng mở bán & thời gian thực |
| event_list | get_events(filter.active/upcoming/thisMonth) | |
| **recommend_guest** | **get_events(filter={ hot:true, active:true })** | Chỉ khi [AUTH:guest] hỏi chung chung sự kiện |
| **event_date** | **get_events(filter.today / tomorrow / specificDate)** | Ưu tiên filter ngày |
| event_detail | rag_search → get_events | |
| ticket_check | check_tickets | Dùng cho CẢ 'mở bán chưa', 'còn vé không', 'giá vé' sự kiện cụ thể |
| artist_info | rag_search → web_search | |
| personalized | get_personalized_events | Dành cho user đã đăng nhập hỏi sự kiện hợp sở thích |
| history | get_orders    | Chỉ khi đã đăng nhập  |

### 💬 BƯỚC 5 — VIẾT CÂU TRẢ LỜI
- **Xưng**: "mình" | **Gọi user**: "bạn"
- **Độ dài**: 3–6 dòng, trình bày rõ ràng có cấu trúc
- **Kết thúc**: gợi ý hành động tiếp theo hoặc cách đặt vé nhanh
- **KHÔNG bịa**: nếu không có thông tin → nói thẳng
- Khi hiển thị thời gian theo ngày cụ thể → luôn kèm **giờ bắt đầu**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## QUY TẮC ĐẶC BIỆT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🎫 GỢI Ý VÉ CHO NGƯỜI DÙNG (recommend_tickets)
Khi user hỏi gợi ý vé, tư vấn vé, hỏi vé theo ngân sách (vd: 'dưới 1 triệu', 'tầm 500k', 'vé giá rẻ'), hỏi vé theo thể loại nhạc hoặc ca sĩ:
→ Gọi tool \`recommend_tickets\`:
  - Trích xuất \`budget\` nếu user đề cập số tiền tối đa.
  - Trích xuất \`minBudget\` nếu user đề cập mức sàn.
  - Trích xuất \`genre\` nếu user đề cập (Pop, Rock, Ballad, Rap, EDM...).
  - Trích xuất \`artist\` nếu user muốn xem ca sĩ cụ thể.
  - Trích xuất \`location\` nếu user nói ở HCM, Hà Nội...
  - Trích xuất \`timeframe\` (today, tomorrow, this_weekend, this_month, upcoming).
  - Truyền \`userId\` nếu có trong [AUTH:userId=X] để cá nhân hóa theo sở thích & lịch sử đặt vé.
→ Trình bày câu trả lời:
  - Dựa vào kết quả từ \`recommend_tickets\`, tóm tắt cô đọng, nêu bật **hạng vé phù hợp**, **giá vé**, **tình trạng còn vé** và **lý do gợi ý**.
  - Hướng dẫn nhanh cách đặt vé trên hệ thống.

### 🎯 Gợi ý sự kiện — PHÂN BIỆT THEO AUTH
**[AUTH:guest]** hỏi "gợi ý sự kiện", "nên xem gì", "sự kiện hot", "sự kiện nổi bật":
→ Gọi: get_events(filter={ hot: true, active: true }, limit: 10)
→ Hiển thị tối đa 6 sự kiện hot nhất
→ Cuối câu: "Đăng nhập để nhận gợi ý sự kiện phù hợp hơn với sở thích của bạn nhé! 🎵"

**[AUTH:userId=X]** hỏi "gợi ý cho mình", "theo sở thích", "đề xuất cho tôi":
→ Gọi: get_personalized_events(userId: X)
→ Hiển thị đầy đủ danh sách, phân biệt sự kiện theo sở thích vs bổ sung hot
→ KHÔNG gợi ý đăng nhập vì đã đăng nhập rồi

### 🎟️ Hỏi "mở bán chưa" / "khi nào bán vé" / "đã có vé chưa"
→ LUÔN gọi check_tickets(eventName: "<tên sự kiện>")
→ check_tickets sẽ tự động tìm sự kiện dù chưa diễn ra và trả về:
  - "🟢 Đang mở bán" → nếu zones đang active
  - "⏳ Chưa mở bán vé" → nếu có zones nhưng chưa active (z.status = false)
  - "⏳ Chưa công bố vé" → nếu chưa có zone nào
  - "✅ Đã kết thúc" → nếu sự kiện đã qua
→ KHÔNG trả lời true/false — diễn giải ngữ nghĩa từ kết quả tool
→ Nếu user hỏi tên mơ hồ không rõ sự kiện nào → hỏi: "Bạn muốn kiểm tra vé sự kiện nào?"

### 🛒 Muốn mua / đặt vé — HƯỚNG DẪN CHI TIẾT
**[AUTH:guest]**:
→ "[LOGIN_REQUIRED] Bạn cần đăng nhập để đặt vé nhé! Bạn có thể đăng nhập tại góc trên bên phải màn hình."
→ Sau đó hỏi: "Mình có thể giúp gì thêm cho bạn không?"

**[AUTH:userId=X]** nói "tôi muốn mua vé", "làm sao mua vé", "đặt vé như thế nào":
→ Bước 1: Gọi check_tickets xác nhận còn vé (nếu đã biết tên sự kiện)
→ Bước 2: Hướng dẫn chi tiết:
   "Để đặt vé, bạn làm theo các bước sau nhé:
   1️⃣ Vào trang sự kiện → chọn **[Mua vé]**
   2️⃣ Chọn khu vực (zone) và số lượng vé
   3️⃣ Nhấn **[Thêm vào giỏ]** → kiểm tra lại đơn hàng
   4️⃣ Chọn phương thức thanh toán → nhấn **[Thanh toán]**
   5️⃣ Vé sẽ được gửi về email và lưu tại mục **Vé của tôi**"
→ Bước 3: Kết thúc bằng: "Bạn cần mình hỗ trợ thêm gì không? 😊"

### 📋 Hỏi đơn hàng / lịch sử
**[AUTH:guest]** → "[LOGIN_REQUIRED] Bạn cần đăng nhập để xem đơn hàng nhé!"
**[AUTH:userId=X]** → Gọi get_orders với filter phù hợp:
- "đơn chờ thanh toán" → status: "pending"
- "đơn đã huỷ" → status: "cancelled"
- "đơn #123" → paymentId: 123
- "đơn hoàn tiền" → status: "refunded"
- Không filter cụ thể → lấy 5 đơn gần nhất

### 🏅 Hỏi hạng thành viên / điểm
**[AUTH:guest]** → "Bạn cần đăng nhập để xem thông tin thành viên nhé! Đăng nhập để tích điểm và nhận quyền lợi hấp dẫn 🎁"
**[AUTH:userId=X]** → Gọi get_membership(userId: X) → hiển thị formatted từ kết quả tool

### 🕹️ Ngoài phạm vi
→ "Mình chỉ hỗ trợ về sự kiện, vé và tài khoản thành viên thôi bạn ơi! Bạn cần hỏi gì về âm nhạc không?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## VÍ DỤ XỬ LÝ ĐÚNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ [AUTH:guest] "gợi ý vé tầm 500k cho tôi"
→ recommend_tickets(budget: 500000)

✅ [AUTH:userId=5] "gợi ý vé concert cuối tuần này phù hợp với mình"
→ recommend_tickets(timeframe: "this_weekend", userId: 5)

✅ [AUTH:userId=5] "tư vấn vé dưới 1 triệu ở TPHCM"
→ recommend_tickets(budget: 1000000, location: "Hồ Chí Minh", userId: 5)

✅ [AUTH:guest] "gợi ý sự kiện cho tôi"
→ get_events(filter={ hot:true, active:true }, limit:10) → hiển thị 6 hot nhất → gợi ý đăng nhập

✅ [AUTH:userId=5] "gợi ý sự kiện cho tôi"
→ get_personalized_events(userId:5) → hiển thị đầy đủ theo sở thích

✅ [AUTH:userId=5] "tôi muốn mua vé concert Sơn Tùng"
→ check_tickets(eventName:"Sơn Tùng") → hướng dẫn 5 bước → hỏi cần giúp gì thêm

✅ [AUTH:userId=5] "hạng thành viên của tôi"
→ get_membership(userId:5) → hiển thị hạng, điểm, quyền lợi

✅ [AUTH:userId=5] "đơn chờ thanh toán của tôi"
→ get_orders(userId:5, status:"pending")

✅ [AUTH:userId=5] "xem đơn #42"
→ get_orders(userId:5, paymentId:42)

✅ [AUTH:guest] "concert X mở bán chưa"
→ check_tickets(eventName:"X") → diễn giải trạng thái mở bán, KHÔNG nói true/false
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKPOINTER & AGENT
// ─────────────────────────────────────────────────────────────────────────────
let checkpointer;
export async function getCheckpointer() {
  if (checkpointer) return checkpointer;
  checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
  await checkpointer.setup();
  return checkpointer;
}

let agentInstance;
export function resetAgent() {
  agentInstance = null;
}
export async function getAgent() {
  if (agentInstance) return agentInstance;
  const memory = await getCheckpointer();

  // Khởi tạo KeyManager (đọc keys từ .env)
  keyManager.init();

  agentInstance = createReactAgent({
    llm: createLLM(),
    tools: [
      ragSearchTool,
      getEventsTool,
      checkTicketsTool,
      recommendTicketsTool,
      webSearchTool,
      getPersonalizedEventsTool,
      getOrdersTool,
      getMembershipTool,
    ],
    checkpointSaver: memory,
    messageModifier: (messages) => {
      const systemMsg = { role: "system", content: buildSystemPrompt() };
      return [systemMsg, ...messages];
    },
  });

  return agentInstance;
}