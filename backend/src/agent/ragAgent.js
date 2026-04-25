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

// ─────────────────────────────────────────────────────────────────────────────
// LLM & EMBEDDINGS — tự động dùng key từ KeyManager, fallback khi lỗi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tạo một LLM instance với API key hiện tại.
 * Gọi lại hàm này sau khi keyManager.reportError() để lấy instance mới.
 */
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
function _isKeyError(err) {
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

      const filtered = results.filter(([, score]) => score >= 0.30);

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
        .map(([doc, score], i) => {
          const relevance = (score * 100).toFixed(0);
          return `[Kết quả ${i + 1} — phù hợp ${relevance}%]\n${doc.pageContent}`;
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
               MIN(z.zone_price) AS min_price
        FROM events e
        JOIN categories c ON e.category_id = c.category_id
        LEFT JOIN zones z ON z.event_id = e.event_id
        WHERE e.event_status = true
      `;
      const params = [];

      if (filter?.category) {
        params.push(`%${filter.category}%`);
        query += ` AND c.category_name ILIKE $${params.length}`;
      }
      if (filter?.location) {
        params.push(`%${filter.location}%`);
        query += ` AND e.event_location ILIKE $${params.length}`;
      }
      if (filter?.artistName) {
        params.push(`%${filter.artistName}%`);
        query += ` AND e.event_artist::text ILIKE $${params.length}`;
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

      params.push(Math.min(limit, 5));
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

          if (now >= start && now <= end) {
            statusIcon = "🔴 ĐANG DIỄN RA";
          } else if (startDate.getTime() === todayDate.getTime()) {
            statusIcon = "📌 HÔM NAY";
          } else if (startDate.getTime() === tomorrowDate.getTime()) {
            statusIcon = "📅 NGÀY MAI";
          } else if (now < start) {
            statusIcon = "📅 Sắp diễn ra";
          } else {
            statusIcon = "✅ Đã kết thúc";
          }

          const timeStr = (filter?.today || filter?.tomorrow || filter?.specificDate)
            ? `${start.toLocaleDateString("vi-VN")} lúc ${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
            : start.toLocaleDateString("vi-VN");

          return (
            `🎵 **${ev.event_name}** [ID:${ev.event_id}]\n` +
            `   📍 ${ev.event_location}\n` +
            `   🕐 ${timeStr} — ${statusIcon}\n` +
            `   🎤 ${artists}\n` +
            `   💰 Từ ${minPrice}`
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
      "Trả về tối đa 5 sự kiện với giá vé và trạng thái.",
    schema: z.object({
      filter: z
        .object({
          category:     z.string().optional().describe("Tên thể loại"),
          location:     z.string().optional().describe("Địa điểm tổ chức"),
          artistName:   z.string().optional().describe("Tên nghệ sĩ biểu diễn"),
          today:        z.boolean().optional().describe("true → sự kiện diễn ra NGAY HÔM NAY"),
          tomorrow:     z.boolean().optional().describe("true → sự kiện diễn ra NGÀY MAI"),
          specificDate: z.string().optional().describe("Ngày cụ thể định dạng YYYY-MM-DD"),
          upcoming:     z.boolean().optional().describe("Sự kiện chưa bắt đầu (event_start > NOW)"),
          thisMonth:    z.boolean().optional().describe("Sự kiện trong tháng hiện tại"),
          active:       z.boolean().optional().describe("Sự kiện chưa kết thúc (event_end >= NOW)"),
          hot:          z.boolean().optional().describe("Sắp xếp theo độ hot: tỉ lệ bán cao nhất"),
        })
        .optional(),
      limit: z.number().optional().default(5),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 3: Check Tickets
// ─────────────────────────────────────────────────────────────────────────────
export const checkTicketsTool = tool(
  async ({ eventName, eventId, zoneCode }) => {
    try {
      let query = `
        SELECT z.zone_id, z.zone_name, z.zone_code,
               z.zone_price, z.zone_quantity, z.sold_quantity,
               (z.zone_quantity - z.sold_quantity) AS available,
               z.status,
               e.event_id, e.event_name, e.event_start, e.event_end
        FROM zones z
        JOIN events e ON z.event_id = e.event_id
        WHERE e.event_status = true
          AND e.event_end >= NOW()
          AND z.status = true
      `;
      const params = [];

      if (eventId) {
        params.push(eventId);
        query += ` AND e.event_id = $${params.length}`;
      } else if (eventName) {
        params.push(`%${eventName}%`);
        query += ` AND e.event_name ILIKE $${params.length}`;
      }
      if (zoneCode) {
        params.push(zoneCode.toUpperCase());
        query += ` AND UPPER(z.zone_code) = $${params.length}`;
      }

      query += ` ORDER BY z.zone_price ASC`;

      const result = await pool.query(query, params);
      if (result.rows.length === 0)
        return "⚠️ Không tìm thấy thông tin vé. Vui lòng kiểm tra lại tên sự kiện.";

      const eventName_ = result.rows[0].event_name;
      const eventStart = new Date(result.rows[0].event_start).toLocaleDateString("vi-VN");

      const header = `🎫 **Thông tin vé: ${eventName_}** (${eventStart})\n`;
      const rows = result.rows
        .map((z) => {
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

      return header + rows;
    } catch (err) {
      console.error("Ticket check error:", err.message);
      return "❌ Lỗi khi kiểm tra vé.";
    }
  },
  {
    name: "check_tickets",
    description:
      "Kiểm tra tình trạng vé real-time: còn bao nhiêu, giá bao nhiêu, khu vực nào còn/hết.",
    schema: z.object({
      eventName: z.string().optional().describe("Tên sự kiện (tìm gần đúng)"),
      eventId:   z.number().optional().describe("ID sự kiện (chính xác hơn eventName)"),
      zoneCode:  z.string().optional().describe("Mã khu vực: GA, VIP, VVIP, SUPER_FAN..."),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 4: Personalized Events
// ─────────────────────────────────────────────────────────────────────────────
export const getPersonalizedEventsTool = tool(
  async ({ userId, limit = 5 }) => {
    try {
      const { getHybridRecommendations } = await import("./Recommendation.service.js");
      const result = await getHybridRecommendations(userId, limit, limit);

      return JSON.stringify({
        success: true,
        type: result.type,
        events: result.events,
      });
    } catch (err) {
      console.error("Personalized events error:", err.message);
      return JSON.stringify({ success: false, message: "Lỗi khi lấy gợi ý sự kiện." });
    }
  },
  {
    name: "get_personalized_events",
    description:
      "Gợi ý sự kiện cá nhân hóa theo lịch sử & sở thích của user đã đăng nhập.",
    schema: z.object({
      userId: z.number().describe("ID người dùng (lấy từ AUTH context)"),
      limit: z.number().optional().default(5).describe("Số sự kiện trả về, tối đa 5"),
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
        params.push(status);
        query += ` AND p.payment_status = $${params.length}`;
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

export const getAccountInfoTool = tool(
  async ({ userId }) => {
    try {
      const result = await pool.query(
        `SELECT
           u.user_id,
           u.fullName,
           u.email,
           u.phoneNumber,
           u.status,
           u.point,
           m.membership,
           m.member_point
         FROM users u
         LEFT JOIN members m ON m.member_id = u.member_id
         WHERE u.user_id = $1
         LIMIT 1`,
        [userId]
      );

      const user = result.rows[0];
      if (!user) {
        return "ℹ️ Mình chưa tìm thấy thông tin tài khoản của bạn.";
      }

      return (
        `👤 **${user.fullname || "Tài khoản của bạn"}**\n` +
        `   📧 ${user.email || "Chưa cập nhật"}\n` +
        `   📱 ${user.phonenumber || "Chưa cập nhật"}\n` +
        `   🏅 Hạng thành viên: ${user.membership || "Chưa cập nhật"}\n` +
        `   ⭐ Điểm hiện tại: ${Number(user.point || 0).toLocaleString("vi-VN")}\n` +
        `   🎯 Mốc hạng hiện tại: ${Number(user.member_point || 0).toLocaleString("vi-VN")} điểm\n` +
        `   📌 Trạng thái: ${user.status || "Chưa cập nhật"}`
      );
    } catch (err) {
      console.error("Get account info error:", err.message);
      return "❌ Lỗi khi truy vấn thông tin tài khoản.";
    }
  },
  {
    name: "get_account_info",
    description:
      "Lấy thông tin tài khoản người dùng đã đăng nhập: hạng thành viên, điểm tích lũy, trạng thái và liên hệ.",
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
| **event_list** | "sự kiện tháng này", "có những show nào", "sự kiện ở HCM" |
| **event_date** | "hôm nay", "tối nay", "ngày mai", "tối mai", "ngày 25/12", "thứ Bảy này" |
| **event_detail** | tên sự kiện cụ thể, hỏi chi tiết về 1 show |
| **ticket_check** | "còn vé không", "giá vé", "vé VIP", "vé GA" |
| **artist_info** | hỏi về nghệ sĩ, ca sĩ, ban nhạc |
| **recommend_guest** | "gợi ý sự kiện" + [AUTH:guest], "nên xem gì", "sự kiện hot", "sự kiện nổi bật" |
| **personalized** | "gợi ý sự kiện", "gợi ý cho mình", "theo sở thích", "phù hợp với tôi" + [AUTH:userId=X] |
| **purchase** | "mua vé", "đặt vé", "thanh toán" |
| **history** | "vé của tôi", "lịch sử mua", "đã mua" |
| **account** | "tài khoản", "hạng thành viên", "điểm tích lũy", "hạng của tôi" |
| **out_of_scope** | không liên quan âm nhạc/vé |

### 📅 BƯỚC 2 — PARSE NGÀY TỪ NGÔN NGỮ TỰ NHIÊN
Khi nhóm là **event_date**, tự chuyển đổi trước khi gọi tool:

| User nói | Filter cần dùng |
|---|---|
| "hôm nay", "tối nay", "show hôm nay" | \`today: true\` |
| "ngày mai", "tối mai", "show ngày mai" | \`tomorrow: true\` |
| "thứ Bảy này", "cuối tuần này" | Tính ngày từ hôm nay → \`specificDate: "YYYY-MM-DD"\` |
| "25/12", "25 tháng 12" | \`specificDate: "YYYY-12-25"\` (năm hiện tại) |
| "ngày 1/5/2025", "01-05-2025" | \`specificDate: "2025-05-01"\` |
| "tuần tới", "Chủ Nhật tới" | Tính ngày cụ thể → \`specificDate: "YYYY-MM-DD"\` |

### ❓ BƯỚC 3 — KIỂM TRA THÔNG TIN ĐỦ CHƯA
- **ticket_check** mà THIẾU tên sự kiện → Hỏi: "Bạn muốn kiểm tra vé sự kiện nào?"
- **event_detail** mà tên mơ hồ → Hỏi xác nhận tên
- **event_date** → LUÔN ĐỦ thông tin, gọi tool ngay
- **event_list** → LUÔN ĐỦ thông tin, gọi tool ngay

### 🔧 BƯỚC 4 — CHỌN CÔNG CỤ PHÙ HỢP
| Nhóm | Công cụ chính | Ghi chú |
|---|---|---|
| event_list | get_events(filter.active/upcoming/thisMonth) | |
| **recommend_guest** | **get_events(filter={ hot:true, active:true })** | Chỉ khi [AUTH:guest] |
| **event_date** | **get_events(filter.today / tomorrow / specificDate)** | Ưu tiên filter ngày |
| event_detail | rag_search → get_events | |
| ticket_check | check_tickets | |
| artist_info | rag_search → web_search | |
| personalized | get_personalized_events | Chỉ khi đã đăng nhập, trả tối đa 5 gợi ý |
| history | get_orders | Chỉ khi đã đăng nhập |
| account | get_account_info | Chỉ khi đã đăng nhập |

### 💬 BƯỚC 5 — VIẾT CÂU TRẢ LỜI
- **Xưng**: "mình" | **Gọi user**: "bạn"
- **Độ dài**: 3–6 dòng, KHÔNG liệt kê quá 5 items
- **Kết thúc**: gợi ý hành động tiếp theo nếu phù hợp
- **KHÔNG bịa**: nếu không có thông tin → nói thẳng
- Khi hiển thị thời gian theo ngày cụ thể → luôn kèm **giờ bắt đầu**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## QUY TẮC ĐẶC BIỆT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🎫 Lịch sử mua vé
Khi user hỏi "vé của tôi", "lịch sử mua", "đơn hàng của tôi":
→ Gọi get_orders(userId=X, limit=5) nếu đã đăng nhập
→ Nếu là guest, mời đăng nhập để xem đơn hàng

### 🎯 Gợi ý sự kiện cho user vãng lai
Khi [AUTH:guest] hỏi "gợi ý", "nên xem gì", "sự kiện hot":
→ Gọi: get_events(filter={ hot: true, active: true }, limit: 5)
→ Cuối câu: "Đăng nhập để nhận gợi ý sự kiện phù hợp hơn với bạn nhé!"

### 🎯 Gợi ý sự kiện cho user đã đăng nhập
Khi [AUTH:userId=X] hỏi "gợi ý sự kiện", "nên xem gì", "gợi ý cho mình":
→ Gọi: get_personalized_events(userId=X, limit=5)
→ Trả tối đa 5 sự kiện từ tool

### 🛒 Muốn mua / đặt vé
- [AUTH:guest] → hướng dẫn chi tiết theo thứ tự:
  1. Đăng nhập tài khoản
  2. Chọn sự kiện muốn mua
  3. Chọn khu vực vé và số lượng
  4. Kiểm tra đơn hàng rồi thanh toán
  5. Kết lại bằng: "Bạn cần mình giúp gì thêm không?"
- [AUTH:userId=X] → hướng dẫn chi tiết theo thứ tự:
  1. Vào trang sự kiện muốn mua
  2. Chọn khu vực vé và số lượng
  3. Kiểm tra giá và thông tin đơn hàng
  4. Thanh toán để hoàn tất
  5. Kết lại bằng: "Bạn cần mình giúp gì thêm không?"

### 👤 Tài khoản / hạng thành viên
- [AUTH:guest] → mời đăng nhập để xem hạng thành viên và điểm
- [AUTH:userId=X] → gọi get_account_info(userId=X)

### 🧾 Đơn hàng
- Nếu user hỏi lịch sử mua, đơn hàng, đơn chờ thanh toán, đơn đã huỷ, đơn hoàn tiền:
  → Gọi get_orders với trạng thái phù hợp nếu user nói rõ
- Nếu user hỏi chung chung:
  → Gọi get_orders(userId=X, limit=5)
- Mapping gợi ý:
  pending = chờ thanh toán
  success = đã thanh toán / thành công
  cancelled = đã huỷ / hủy
  refunded = hoàn tiền
  failed = thất bại

### 🕹️ Ngoài phạm vi
→ "Mình chỉ hỗ trợ về sự kiện và vé âm nhạc thôi bạn ơi!"
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
      webSearchTool,
      getPersonalizedEventsTool,
      getOrdersTool,
      getAccountInfoTool,
    ],
    checkpointSaver: memory,
    messageModifier: (messages) => {
      const systemMsg = { role: "system", content: buildSystemPrompt() };
      return [systemMsg, ...messages];
    },
  });

  return agentInstance;
}
