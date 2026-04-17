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
      idColumnName: "doc_id",
      vectorColumnName: "embedding",
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

      // Threshold: cosine similarity >= 0.30
      const filtered = results.filter(([, score]) => score >= 0.30);

      if (filtered.length === 0) {
        // Fallback: tìm DB bằng keyword
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
      topK: z.number().optional().default(5).describe("Số lượng kết quả (mặc định 5)"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 2: Get Events — lấy danh sách sự kiện từ DB
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
      if (filter?.upcoming) {
        query += ` AND e.event_start > NOW()`;
      }
      if (filter?.thisMonth) {
        query += ` AND e.event_start <= DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'
                   AND e.event_end   >= DATE_TRUNC('month', NOW())`;
      }
      if (filter?.active) {
        query += ` AND e.event_end >= NOW()`;
      }

      query += ` GROUP BY e.event_id, c.category_name, c.category_id`;

      params.push(Math.min(limit, 6));
      query += ` ORDER BY e.event_start ASC LIMIT $${params.length}`;

      const result = await pool.query(query, params);
      if (result.rows.length === 0) return "ℹ️ Không tìm thấy sự kiện phù hợp.";

      const now = new Date();
      return result.rows
        .map((ev) => {
          const start = new Date(ev.event_start);
          const end   = new Date(ev.event_end);
          const artists = ev.event_artist?.map((a) => a.name).join(", ") || "Chưa cập nhật";
          const minPrice = ev.min_price ? formatCurrency(ev.min_price) : "Chưa cập nhật";
          let statusIcon;
          if (now < start)    statusIcon = "📅 Sắp diễn ra";
          else if (now > end) statusIcon = "✅ Đã kết thúc";
          else                statusIcon = "🔴 ĐANG DIỄN RA";

          return (
            `🎵 **${ev.event_name}** [ID:${ev.event_id}]\n` +
            `   📍 ${ev.event_location}\n` +
            `   📅 ${start.toLocaleDateString("vi-VN")} — ${statusIcon}\n` +
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
      "Dùng khi: hỏi sự kiện tháng này, sự kiện ở đâu, sự kiện đang/sắp diễn ra, " +
      "sự kiện của nghệ sĩ nào. Trả về tối đa 5-6 sự kiện với giá vé.",
    schema: z.object({
      filter: z.object({
        category:   z.string().optional().describe("Tên thể loại"),
        location:   z.string().optional().describe("Địa điểm"),
        artistName: z.string().optional().describe("Tên nghệ sĩ"),
        upcoming:   z.boolean().optional().describe("Sự kiện sắp diễn ra"),
        thisMonth:  z.boolean().optional().describe("Sự kiện trong tháng này"),
        active:     z.boolean().optional().describe("Sự kiện chưa kết thúc"),
      }).optional(),
      limit: z.number().optional().default(5),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 3: Check Tickets — kiểm tra vé real-time
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

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 4: Get Personalized Events — gợi ý theo sở thích user
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 5: Web Search — tìm kiếm ngoài hệ thống
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
      "Tìm kiếm thông tin ngoài hệ thống: tin tức nghệ sĩ mới nhất, " +
      "thông tin bên ngoài không có trong database (album mới, tour diễn quốc tế...). " +
      "CHỈ dùng khi rag_search và get_events không có thông tin.",
    schema: z.object({
      query: z.string().describe("Từ khóa tìm kiếm tiếng Việt hoặc tiếng Anh"),
    }),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — workflow-driven, think-before-answer
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
Trước khi làm bất cứ điều gì, phân loại câu hỏi vào một trong các nhóm:
| Nhóm | Dấu hiệu nhận biết |
|---|---|
| **event_list** | "sự kiện tháng này", "có những show nào", "sự kiện ở HCM" |
| **event_detail** | tên sự kiện cụ thể, hỏi chi tiết về 1 show |
| **ticket_check** | "còn vé không", "giá vé", "vé VIP", "vé GA" |
| **artist_info** | hỏi về nghệ sĩ, ca sĩ, ban nhạc |
| **personalized** | "gợi ý cho mình", "theo sở thích", "phù hợp với tôi" |
| **purchase** | "mua vé", "đặt vé", "thanh toán" |
| **history** | "vé của tôi", "lịch sử mua", "đã mua" |
| **out_of_scope** | không liên quan âm nhạc/vé |

### ❓ BƯỚC 2 — KIỂM TRA THÔNG TIN ĐỦ CHƯA
Với **ticket_check** mà THIẾU tên sự kiện:
→ Hỏi: "Bạn muốn kiểm tra vé sự kiện nào vậy? Nếu có khu vực cụ thể (VIP, GA...) bạn cho mình biết thêm nhé!"

Với **event_detail** mà tên mơ hồ:
→ Hỏi: "Bạn đang hỏi về sự kiện '[tên mơ hồ]' đúng không? Hay là một sự kiện khác?"

Với **personalized** mà là [AUTH:guest]:
→ Không cần hỏi, trả lời luôn: yêu cầu đăng nhập + gợi ý sự kiện nổi bật

Với **event_list** → ĐỦ thông tin, KHÔNG cần hỏi thêm

### 🔧 BƯỚC 3 — CHỌN CÔNG CỤ PHÙ HỢP
| Nhóm | Công cụ chính | Công cụ phụ |
|---|---|---|
| event_list | get_events | — |
| event_detail | rag_search | get_events |
| ticket_check | check_tickets | rag_search |
| artist_info | rag_search | web_search |
| personalized | get_personalized_events | get_events |
| purchase | check_tickets | — |
| Nếu rag_search trả về ít | web_search | — |

**Nguyên tắc**: Luôn thử rag_search trước khi web_search.
Nếu kết quả độ phù hợp < 40% → bổ sung web_search hoặc thông báo không đủ thông tin.

### 💬 BƯỚC 4 — VIẾT CÂU TRẢ LỜI
Sau khi có dữ liệu từ tool, viết câu trả lời theo quy tắc:
- **Xưng**: "mình" | **Gọi user**: "bạn"
- **Độ dài**: 3–6 dòng, KHÔNG liệt kê quá 4 items
- **Format số**: dùng formatCurrency (₫ với dấu phân cách ngàn)
- **Kết thúc**: thêm gợi ý hành động tiếp theo nếu phù hợp
- **KHÔNG bịa**: nếu không có thông tin → nói thẳng

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## QUY TẮC ĐẶC BIỆT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🎫 Lịch sử mua vé / Vé đã mua
→ Trả lời: "Bạn xem vé của mình tại mục **Vé của tôi** trên thanh menu nhé!"
→ KHÔNG gọi tool nào

### 🛒 Muốn mua / đặt vé
- [AUTH:guest] → "[LOGIN_REQUIRED] Bạn cần đăng nhập để đặt vé nhé!"
- [AUTH:userId=X] → Gọi check_tickets để xác nhận còn vé, rồi:
  → "Để đặt vé, bạn vào trang sự kiện, chọn khu vực và tiến hành thanh toán nhé!"

### 🕹️ Ngoài phạm vi
→ "Mình chỉ hỗ trợ về sự kiện và vé âm nhạc thôi bạn ơi! Bạn cần hỏi gì về sự kiện không?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## VÍ DỤ XỬ LÝ ĐÚNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ User: "còn vé không"
→ Phân loại: ticket_check | Thiếu: tên sự kiện
→ Hỏi: "Bạn muốn kiểm tra vé sự kiện nào vậy? Nếu có khu vực cụ thể mình kiểm tra luôn nhé!"

✅ User: "vé ANH TRAI SAY HI còn không"
→ Phân loại: ticket_check | Đủ thông tin
→ Gọi: check_tickets(eventName="ANH TRAI SAY HI")
→ Trả lời với danh sách zone kèm trạng thái + giá

✅ User: "Sơn Tùng có show không tháng này"
→ Phân loại: event_list + artist_info | Đủ thông tin
→ Gọi: get_events(filter={thisMonth:true, artistName:"Sơn Tùng"})
→ Nếu rỗng: rag_search(query="Sơn Tùng sự kiện biểu diễn")
→ Trả lời cụ thể hoặc thông báo không có

✅ User: "gợi ý sự kiện cho mình" (đã đăng nhập, userId=5)
→ Phân loại: personalized | Đủ thông tin
→ Gọi: get_personalized_events(userId=5)
→ Trả lời với lý do gợi ý ngắn gọn
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