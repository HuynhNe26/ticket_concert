import "dotenv/config";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { pool } from "../config/database.js";
import { getDateContext, formatCurrency } from "../utils/helpers.js";

// ─── LLM ─────────────────────────────────────────────────────────────────────
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2,
  maxOutputTokens: 1500,
});

// ─── EMBEDDINGS ───────────────────────────────────────────────────────────────
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
  taskType: "RETRIEVAL_QUERY",
  outputDimensionality: 2000,
});

// ─── VECTOR STORE ─────────────────────────────────────────────────────────────
let vectorStore;
export async function getVectorStore() {
  if (vectorStore) return vectorStore;
  vectorStore = await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: { connectionString: process.env.DATABASE_URL },
    tableName: "rag_documents",
    columns: {
      idColumnName:      "doc_id",
      vectorColumnName:  "embedding",
      contentColumnName: "content",
      metadataColumnName: "meta",
    },
    distanceStrategy: "cosine",
  });
  return vectorStore;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 1: RAG Search — tìm kiếm semantic trong vector store
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

      // ── Filter theo thể loại ──────────────────────────────────────────────
      if (filter?.category) {
        params.push(`%${filter.category}%`);
        query += ` AND c.category_name ILIKE $${params.length}`;
      }

      // ── Filter theo địa điểm ──────────────────────────────────────────────
      if (filter?.location) {
        params.push(`%${filter.location}%`);
        query += ` AND e.event_location ILIKE $${params.length}`;
      }

      // ── Filter theo nghệ sĩ ───────────────────────────────────────────────
      if (filter?.artistName) {
        params.push(`%${filter.artistName}%`);
        query += ` AND e.event_artist::text ILIKE $${params.length}`;
      }

      // ── Filter theo ngày ──────────────────────────────────────────────────
      // "Diễn ra ngày X" = sự kiện bắt đầu vào ngày X (event_start::date = X)
      // Concert thường bắt đầu và kết thúc trong cùng 1 ngày.
      if (filter?.today) {
        query += ` AND e.1event_end::date = CURRENT_DATE`;

      } else if (filter?.tomorrow) {
        query += ` AND e.1event_end::date = (CURRENT_DATE + INTERVAL '1 day')::date`;

      } else if (filter?.specificDate) {
        // Nhận chuỗi YYYY-MM-DD từ agent (agent tự parse từ ngôn ngữ tự nhiên)
        params.push(filter.specificDate);
        query += ` AND e.1event_end::date = $${params.length}::date`;

      } else if (filter?.upcoming) {
        query += ` AND e.event_start > NOW()`;

      } else if (filter?.thisMonth) {
        query += ` AND e.event_start <= DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'
                   AND e.event_end   >= DATE_TRUNC('month', NOW())`;

      } else if (filter?.active) {
        query += ` AND e.event_end >= NOW()`;
      }

      // hot: chỉ lấy sự kiện chưa kết thúc và có dữ liệu zone thực tế
      if (filter?.hot) {
        query += ` AND e.event_end >= NOW() AND z.status = true`;
      }

      query += ` GROUP BY e.event_id, c.category_name, c.category_id`;

      // ── Sắp xếp ───────────────────────────────────────────────────────────
      if (filter?.hot) {
        // Ưu tiên: tỉ lệ bán cao → tổng lượt bán nhiều → sự kiện diễn ra sớm
        query += `
          HAVING SUM(z.zone_quantity) > 0
          ORDER BY
            ROUND(SUM(z.sold_quantity)::numeric / NULLIF(SUM(z.zone_quantity), 0) * 100, 1) DESC,
            SUM(z.sold_quantity) DESC,
            e.event_start ASC`;
      } else {
        query += ` ORDER BY e.event_start ASC`;
      }

      params.push(Math.min(limit, 6));
      query += ` LIMIT $${params.length}`;

      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        // Trả về thông báo gợi ý ngày thay thế nếu tìm theo ngày
        if (filter?.today)        return "ℹ️ Hôm nay không có sự kiện nào đang diễn ra.";
        if (filter?.tomorrow)     return "ℹ️ Ngày mai chưa có sự kiện nào được lên lịch.";
        if (filter?.specificDate) return `ℹ️ Không có sự kiện nào vào ngày ${filter.specificDate}.`;
        return "ℹ️ Không tìm thấy sự kiện phù hợp.";
      }

      const now = new Date();
      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
      const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);

      return result.rows
        .map((ev) => {
          const start = new Date(ev.event_start);
          const end   = new Date(ev.event_end);
          const artists  = ev.event_artist?.map((a) => a.name).join(", ") || "Chưa cập nhật";
          const minPrice = ev.min_price ? formatCurrency(ev.min_price) : "Chưa cập nhật";

          // Status icon — ưu tiên hiển thị "HÔM NAY" / "NGÀY MAI" nếu đúng ngày
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

          // Format thời gian bắt đầu kèm giờ nếu tìm theo ngày cụ thể
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
      "Trả về tối đa 5-6 sự kiện với giá vé và trạng thái.",
    schema: z.object({
      filter: z
        .object({
          // ── Lọc theo nội dung ──────────────────────────────────────────
          category:     z.string().optional().describe("Tên thể loại"),
          location:     z.string().optional().describe("Địa điểm tổ chức"),
          artistName:   z.string().optional().describe("Tên nghệ sĩ biểu diễn"),

          // ── Lọc theo ngày ─────────────────────────────────────────────
          today:        z.boolean().optional().describe(
            "true → sự kiện diễn ra NGAY HÔM NAY. " +
            "Dùng khi user hỏi: 'hôm nay', 'tối nay', 'show hôm nay', 'cuối tuần này' (nếu hôm nay là cuối tuần)."
          ),
          tomorrow:     z.boolean().optional().describe(
            "true → sự kiện diễn ra NGÀY MAI. " +
            "Dùng khi user hỏi: 'ngày mai', 'tối mai', 'show ngày mai'."
          ),
          specificDate: z.string().optional().describe(
            "Ngày cụ thể định dạng YYYY-MM-DD. " +
            "Dùng khi user nhắc đến ngày như: '25/12', 'ngày 1 tháng 5', '15-8', '2025-06-20'. " +
            "Agent tự chuyển đổi ngôn ngữ tự nhiên → YYYY-MM-DD trước khi truyền vào đây. " +
            "Năm mặc định là năm hiện tại nếu user không nói."
          ),

          // ── Lọc theo khoảng thời gian ─────────────────────────────────
          upcoming:     z.boolean().optional().describe("Sự kiện chưa bắt đầu (event_start > NOW)"),
          thisMonth:    z.boolean().optional().describe("Sự kiện trong tháng hiện tại"),
          active:       z.boolean().optional().describe("Sự kiện chưa kết thúc (event_end >= NOW)"),

          // ── Gợi ý theo độ hot ─────────────────────────────────────────
          hot:          z.boolean().optional().describe(
            "true → sắp xếp theo độ hot: tỉ lệ bán / tổng capacity cao nhất. " +
            "Dùng khi: user vãng lai hỏi gợi ý, 'sự kiện hot', 'sự kiện bán chạy', " +
            "'nên xem gì', 'sự kiện nổi bật'. Thường kết hợp active:true."
          ),
        })
        .optional(),
      limit: z.number().optional().default(5),
    }),
  }
);

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
      "Kiểm tra tình trạng vé real-time: còn bao nhiêu, giá bao nhiêu, khu vực nào còn/hết. " +
      "Dùng khi user hỏi: 'còn vé không?', 'giá vé VIP?', 'khu GA còn vé?'. " +
      "Nên truyền eventName hoặc eventId để kết quả chính xác hơn.",
    schema: z.object({
      eventName: z.string().optional().describe("Tên sự kiện (tìm gần đúng)"),
      eventId:   z.number().optional().describe("ID sự kiện (chính xác hơn eventName)"),
      zoneCode:  z.string().optional().describe("Mã khu vực: GA, VIP, VVIP, SUPER_FAN..."),
    }),
  }
);

export const getPersonalizedEventsTool = tool(
  async ({ userId }) => {
    try {
      const userResult = await pool.query(
        `SELECT favorite FROM users WHERE user_id = $1`,
        [userId]
      );
      if (userResult.rows.length === 0)
        return JSON.stringify({ success: false, message: "Không tìm thấy người dùng." });

      const favorite = userResult.rows[0].favorite;

      if (!favorite || favorite.length === 0) {
        const fallback = await pool.query(`
          SELECT e.event_id, e.event_name, e.event_location,
                 e.event_start, e.event_artist, c.category_name,
                 MIN(z.zone_price) AS min_price
          FROM events e
          JOIN categories c ON e.category_id = c.category_id
          LEFT JOIN zones z ON z.event_id = e.event_id
          WHERE e.event_status = true AND e.event_end >= NOW()
          GROUP BY e.event_id, c.category_name
          ORDER BY e.event_start ASC
          LIMIT 4
        `);
        return JSON.stringify({
          success: true,
          type: "popular",
          events: fallback.rows,
          keywords: [],
          message: "Bạn chưa có sở thích được lưu. Đây là các sự kiện nổi bật!",
        });
      }

      const keywords = favorite.map((item) => item?.search).filter(Boolean);
      const conditions = keywords
        .map((_, i) => `(
          e.event_name         ILIKE $${i + 1} OR
          c.category_name      ILIKE $${i + 1} OR
          e.event_artist::text ILIKE $${i + 1}
        )`)
        .join(" OR ");
      const params = keywords.map((k) => `%${k}%`);

      const result = await pool.query(
        `SELECT DISTINCT e.event_id, e.event_name, e.event_location,
                e.event_start, e.event_artist, c.category_name,
                MIN(z.zone_price) AS min_price
         FROM events e
         JOIN categories c ON e.category_id = c.category_id
         LEFT JOIN zones z ON z.event_id = e.event_id
         WHERE e.event_status = true AND e.event_end >= NOW() AND (${conditions})
         GROUP BY e.event_id, c.category_name
         ORDER BY e.event_start ASC
         LIMIT 4`,
        params
      );

      return JSON.stringify({
        success: true,
        type: "personalized",
        keywords,
        events: result.rows,
      });
    } catch (err) {
      console.error("Personalized events error:", err.message);
      return JSON.stringify({ success: false, message: "Lỗi khi lấy gợi ý sự kiện." });
    }
  },
  {
    name: "get_personalized_events",
    description:
      "Gợi ý sự kiện cá nhân hóa theo lịch sử & sở thích của user đã đăng nhập. " +
      "Dùng khi user hỏi: 'gợi ý sự kiện cho mình', 'sự kiện phù hợp với tôi', " +
      "'sự kiện theo sở thích'. CHỈ dùng khi user đã đăng nhập (có userId).",
    schema: z.object({
      userId: z.number().describe("ID người dùng (lấy từ AUTH context)"),
    }),
  }
);

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
      "Tìm kiếm thông tin ngoài hệ thống: tin tức nghệ sĩ mới nhất, " +
      "thông tin bên ngoài không có trong database. " +
      "CHỈ dùng khi rag_search và get_events không có thông tin.",
    schema: z.object({
      query: z.string().describe("Từ khóa tìm kiếm tiếng Việt hoặc tiếng Anh"),
    }),
  }
);

export function buildSystemPrompt() {
  const today = getDateContext(); // vd: "Thứ Ba, 22/04/2025"

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
| **personalized** | "gợi ý cho mình", "theo sở thích", "phù hợp với tôi" + [AUTH:userId=X] |
| **purchase** | "mua vé", "đặt vé", "thanh toán" |
| **history** | "vé của tôi", "lịch sử mua", "đã mua" |
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

**Quy tắc parse:**
- Năm không được nhắc → dùng năm từ context "Hôm nay: ..."
- Tháng không được nhắc → dùng tháng hiện tại
- "cuối tuần" → Thứ Bảy hoặc Chủ Nhật gần nhất tính từ hôm nay
- Nếu ngày đã qua trong tháng → chuyển sang tháng sau

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
| personalized | get_personalized_events | Chỉ khi đã đăng nhập |

### 💬 BƯỚC 5 — VIẾT CÂU TRẢ LỜI
- **Xưng**: "mình" | **Gọi user**: "bạn"
- **Độ dài**: 3–6 dòng, KHÔNG liệt kê quá 4 items
- **Kết thúc**: gợi ý hành động tiếp theo nếu phù hợp
- **KHÔNG bịa**: nếu không có thông tin → nói thẳng
- Khi hiển thị thời gian theo ngày cụ thể → luôn kèm **giờ bắt đầu**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## QUY TẮC ĐẶC BIỆT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🎫 Lịch sử mua vé
→ "Bạn xem vé tại mục **Vé của tôi** trên thanh menu nhé!"
→ KHÔNG gọi tool

### 🎯 Gợi ý sự kiện cho user vãng lai
Khi [AUTH:guest] hỏi: "gợi ý sự kiện", "nên xem gì", "sự kiện hot", "sự kiện nổi bật", "sự kiện đang bán chạy":
→ Gọi: get_events(filter={ hot: true, active: true }, limit: 5)
→ KHÔNG yêu cầu đăng nhập — hiển thị luôn danh sách sự kiện hot
→ Cuối câu trả lời gợi ý: "Đăng nhập để nhận gợi ý cá nhân hóa phù hợp hơn với bạn nhé!"

### 🛒 Muốn mua / đặt vé
- [AUTH:guest]    → "[LOGIN_REQUIRED] Bạn cần đăng nhập để đặt vé nhé!"
- [AUTH:userId=X] → Gọi check_tickets xác nhận còn vé → hướng dẫn đặt

### 🕹️ Ngoài phạm vi
→ "Mình chỉ hỗ trợ về sự kiện và vé âm nhạc thôi bạn ơi!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## VÍ DỤ XỬ LÝ ĐÚNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ User: "hôm nay có show gì không"
→ Nhóm: event_date | Parse: today
→ Gọi: get_events(filter={ today: true })
→ Trả lời kèm giờ bắt đầu từng show

✅ User: "tối mai có sự kiện âm nhạc không"
→ Nhóm: event_date | Parse: tomorrow
→ Gọi: get_events(filter={ tomorrow: true })

✅ User: "có show nào ngày 20 tháng 6 không"
→ Nhóm: event_date | Parse: specificDate = "2025-06-20" (dùng năm từ context)
→ Gọi: get_events(filter={ specificDate: "2025-06-20" })

✅ User: "thứ Bảy này có concert không"
→ Nhóm: event_date | Parse: tính ngày thứ Bảy gần nhất từ hôm nay → specificDate
→ Gọi: get_events(filter={ specificDate: "YYYY-MM-DD" })

✅ User: "vé ANH TRAI SAY HI còn không"
→ Nhóm: ticket_check | Đủ thông tin
→ Gọi: check_tickets(eventName="ANH TRAI SAY HI")

✅ User: "gợi ý sự kiện cho mình" (chưa đăng nhập)
→ Nhóm: recommend_guest | [AUTH:guest]
→ Gọi: get_events(filter={ hot: true, active: true }, limit: 5)
→ Trả lời danh sách sự kiện hot + gợi ý đăng nhập để nhận gợi ý cá nhân

✅ User: "sự kiện nào đang hot vậy" (chưa đăng nhập)
→ Nhóm: recommend_guest
→ Gọi: get_events(filter={ hot: true, active: true })

✅ User: "sự kiện tháng này ở HCM"
→ Nhóm: event_list
→ Gọi: get_events(filter={ thisMonth: true, location: "HCM" })
`;
}

// ─── CHECKPOINTER ─────────────────────────────────────────────────────────────
let checkpointer;
export async function getCheckpointer() {
  if (checkpointer) return checkpointer;
  checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
  await checkpointer.setup();
  return checkpointer;
}

// ─── AGENT INSTANCE ───────────────────────────────────────────────────────────
let agentInstance;
export async function getAgent() {
  if (agentInstance) return agentInstance;
  const memory = await getCheckpointer();

  agentInstance = createReactAgent({
    llm,
    tools: [
      ragSearchTool,
      getEventsTool,
      checkTicketsTool,
      webSearchTool,
      getPersonalizedEventsTool,
    ],
    checkpointSaver: memory,
    messageModifier: (messages) => {
      const systemMsg = { role: "system", content: buildSystemPrompt() };
      return [systemMsg, ...messages];
    },
  });

  return agentInstance;
}