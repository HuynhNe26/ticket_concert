import { pool } from "../config/database.js";
import { getAgent } from "./ragAgent.js";

// ─────────────────────────────────────────────────────────────────────────────
// INTENT PATTERNS — phân loại câu hỏi từ phía client
// ─────────────────────────────────────────────────────────────────────────────
const INTENT_PATTERNS = [
  {
    intent: "event_date",
    patterns: [
      /hôm nay/,
      /tối nay/,
      /show.*hôm nay/,
      /ngày mai/,
      /tối mai/,
      /show.*ngày mai/,
      /thứ (hai|ba|tư|năm|sáu|bảy|chủ nhật)/i,
      /cuối tuần/,
      /ngày\s+\d{1,2}[\/\-]\d{1,2}/,
      /ngày\s+\d{1,2}\s+tháng\s+\d{1,2}/,
      /\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/,
      /tuần (này|tới|sau)/,
    ],
  },
  {
    intent: "recommend_guest",
    patterns: [
      /gợi ý.*sự kiện/,
      /sự kiện.*gợi ý/,
      /nên xem gì/,
      /sự kiện.*hot/,
      /sự kiện.*nổi bật/,
      /sự kiện.*bán chạy/,
      /xem gì.*hôm nay/,
      /event.*hot/i,
      /sự kiện.*đang hot/,
    ],
  },
  {
    intent: "ticket_check",
    patterns: [
      /còn vé/,
      /hết vé/,
      /giá vé/,
      /mua vé gì/,
      /khu vực.*vé/,
      /vé.*giá/,
      /zone.*vé/,
      /vé.*zone/,
      /còn slot/,
      /ticket.*còn/,
    ],
  },
  {
    intent: "purchase_intent",
    patterns: [
      /mua vé/,
      /đặt vé/,
      /book vé/,
      /thanh toán/,
      /checkout/,
      /tôi muốn mua/,
      /làm sao.*mua/,
      /cách mua/,
      /hướng dẫn.*mua/,
      /mua như thế nào/,
    ],
  },
  {
    intent: "event_detail",
    patterns: [
      /thông tin.*sự kiện/,
      /chi tiết.*show/,
      /biểu diễn.*khi nào/,
      /concert.*ở đâu/,
      /sự kiện.*ở đâu/,
      /show.*diễn ra/,
    ],
  },
  {
    intent: "event_list",
    patterns: [
      /sự kiện.*tháng/,
      /show.*tháng/,
      /có.*sự kiện/,
      /sự kiện.*sắp/,
      /concert.*nào/,
      /list.*sự kiện/,
      /danh sách.*sự kiện/,
    ],
  },
  {
    intent: "artist_info",
    patterns: [
      /nghệ sĩ/,
      /ca sĩ/,
      /ban nhạc/,
      /idol/,
      /singer/,
      /rapper/,
      /nhóm nhạc/,
    ],
  },
  {
    intent: "personalized",
    patterns: [
      /gợi ý.*tôi/,
      /gợi ý.*mình/,
      /theo sở thích/,
      /phù hợp.*tôi/,
      /recommend/,
      /đề xuất.*tôi/,
      /phù hợp.*mình/,
    ],
  },
  {
    intent: "account",
    patterns: [
      /tài khoản/,
      /đăng nhập/,
      /đăng ký/,
      /mật khẩu/,
      /profile/,
      /thông tin.*cá nhân/,
    ],
  },
  {
    // ── Hạng thành viên ─────────────────────────────────────────────────────
    intent: "membership",
    patterns: [
      /hạng thành viên/,
      /thành viên.*hạng/,
      /điểm tích lũy/,
      /bao nhiêu.*điểm/,
      /điểm.*bao nhiêu/,
      /quyền lợi.*thành viên/,
      /thành viên.*quyền lợi/,
      /tôi đang hạng/,
      /hạng.*gì/,
      /lên hạng/,
      /membership/i,
      /rank.*thành viên/,
      /thẻ thành viên/,
      /điểm thưởng/,
    ],
  },
  {
    intent: "refund",
    patterns: [
      /hoàn tiền/,
      /hủy vé/,
      /đổi vé/,
      /refund/,
      /cancel.*vé/,
      /vé.*cancel/,
    ],
  },
  {
    // ── Lịch sử đơn hàng — mở rộng thêm nhiều pattern ──────────────────────
    intent: "history",
    patterns: [
      /vé của tôi/,
      /lịch sử mua/,
      /đã mua/,
      /vé đã đặt/,
      /my ticket/i,
      /đơn hàng/,
      /đơn của tôi/,
      /đơn #\d+/,
      /đơn số/,
      /tôi đã đặt/,
      /đơn chờ/,
      /đơn đã huỷ/,
      /đơn huỷ/,
      /đơn hoàn tiền/,
      /đơn thất bại/,
      /đơn.*thanh toán/,
      /thanh toán.*đơn/,
      /xem đơn/,
      /kiểm tra đơn/,
      /order.*của tôi/i,
      /payment.*của tôi/i,
      /tôi đã mua gì/,
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFY INTENT
// ─────────────────────────────────────────────────────────────────────────────
function classifyIntent(message, toolsUsed = []) {
  // Ưu tiên intent từ tool đã được agent dùng
  const toolIntentMap = {
    check_tickets:           "ticket_check",
    get_events:              "event_list",
    get_personalized_events: "personalized",
    rag_search:              "event_detail",
    web_search:              "web_search",
    get_orders:              "history",
    get_membership:          "membership",
  };
  for (const [toolName, intent] of Object.entries(toolIntentMap)) {
    if (toolsUsed.includes(toolName)) return intent;
  }

  const msg = message.toLowerCase().normalize("NFC");
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(msg))) return intent;
  }

  return "general";
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const CLARIFICATION_PATTERNS = [
  /bạn muốn kiểm tra .+\?/i,
  /bạn đang hỏi về .+\?/i,
  /bạn muốn tìm .+\?/i,
  /sự kiện nào .+\?/i,
  /bạn cho mình biết thêm/i,
  /bạn thích thể loại nào/i,
  /bạn có thể cho mình biết/i,
  /khu vực cụ thể .+\?/i,
];

function isClarificationQuestion(text) {
  if (!text) return false;
  return CLARIFICATION_PATTERNS.some((p) => p.test(text));
}

function extractAnswer(lastAI) {
  const content = lastAI?.content;
  if (!content) return null;
  if (typeof content === "string") return content.trim() || null;
  if (Array.isArray(content)) {
    return (
      content
        .filter((block) => block?.type === "text" && block?.text)
        .map((block) => block.text)
        .join("")
        .trim() || null
    );
  }
  return null;
}

function extractToolsUsed(messages) {
  return [
    ...new Set(
      messages
        .filter((m) => m._getType?.() === "ai")
        .flatMap((m) => m.tool_calls || [])
        .map((tc) => tc.name)
        .filter(Boolean)
    ),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE CHAT MESSAGE
// ─────────────────────────────────────────────────────────────────────────────
function saveChatMessage({
  userId,
  sessionId,
  message,
  sender,
  intent,
  ticketQuantity = 0,
  metaJson = {},
}) {
  pool
    .query(
      `INSERT INTO chat_ai
         (user_id, session_id, message, sender, intent, ticket_quantity, meta_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        sessionId,
        message,
        sender,
        intent,
        ticketQuantity,
        JSON.stringify(metaJson),
      ]
    )
    .catch((err) => console.error("[Chat] saveChatMessage error:", err.message));
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
export async function getChatHistory(sessionId, limit = 50) {
  const result = await pool.query(
    `SELECT chat_id, user_id, sender, message, intent,
            ticket_quantity, meta_json, created_at
     FROM chat_ai
     WHERE session_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [sessionId, limit]
  );
  return result.rows;
}

export async function deleteSessionHistory(sessionId) {
  await pool.query(`DELETE FROM chat_ai WHERE session_id = $1`, [sessionId]);
}

export async function agentChat(
  userMessage,
  sessionId = "default",
  userId = null
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY");
  }

  const preIntent = classifyIntent(userMessage);

  saveChatMessage({
    userId,
    sessionId,
    message:  userMessage,
    sender:   "user",
    intent:   preIntent,
    metaJson: { preClassified: preIntent },
  });

  const authPrefix    = userId ? `[AUTH:userId=${userId}]` : `[AUTH:guest]`;
  const agentInputMsg = `${authPrefix} ${userMessage}`;

  const agent = await getAgent();
  const config = {
    configurable: { thread_id: sessionId },
    recursionLimit: 12,
  };

  try {
    const result   = await agent.invoke(
      { messages: [{ role: "user", content: agentInputMsg }] },
      config
    );
    const messages = result.messages;

    const lastAI = [...messages]
      .reverse()
      .find((m) => m._getType?.() === "ai" || m.role === "assistant");

    const toolsUsed    = extractToolsUsed(messages);
    const finalIntent  = classifyIntent(userMessage, toolsUsed);
    const answerStr    = extractAnswer(lastAI) ?? "Xin lỗi, mình không thể xử lý yêu cầu này.";
    const isClarifying = isClarificationQuestion(answerStr);

    saveChatMessage({
      userId,
      sessionId,
      message:        answerStr,
      sender:         "bot",
      intent:         finalIntent,
      ticketQuantity: 0,
      metaJson: { toolsUsed, isClarifying, preIntent, finalIntent },
    });

    return { answer: answerStr, toolsUsed, sessionId, isClarifying, intent: finalIntent };

  } catch (err) {
    console.error("[Agent] Full error:", err);
    console.error("[Agent] Message:", err.message);

    // ── Rate limit ───────────────────────────────────────────────────────────
    if (err.message?.includes("429") || err.message?.includes("rate_limit")) {
      const busyMsg = "Hệ thống đang bận, bạn vui lòng thử lại sau 1 phút nhé!";
      saveChatMessage({
        userId, sessionId, message: busyMsg, sender: "bot",
        intent: "error", metaJson: { error: "rate_limit" },
      });
      return { answer: busyMsg, toolsUsed: [], sessionId, intent: "error" };
    }

    // ── Quota hết ────────────────────────────────────────────────────────────
    if (err.message?.includes("quota") || err.message?.includes("resource_exhausted")) {
      const quotaMsg = "Dịch vụ AI đang tạm quá tải, bạn vui lòng thử lại sau ít phút nhé!";
      saveChatMessage({
        userId, sessionId, message: quotaMsg, sender: "bot",
        intent: "error", metaJson: { error: "quota_exceeded" },
      });
      return { answer: quotaMsg, toolsUsed: [], sessionId, intent: "error" };
    }

    // ── Context / token overflow ─────────────────────────────────────────────
    if (err.message?.includes("context") || err.message?.includes("token")) {
      const overflowMsg =
        "Cuộc trò chuyện quá dài rồi! Bạn thử bắt đầu cuộc hội thoại mới nhé (nhấn nút Làm mới).";
      saveChatMessage({
        userId, sessionId, message: overflowMsg, sender: "bot",
        intent: "error", metaJson: { error: "context_overflow" },
      });
      return { answer: overflowMsg, toolsUsed: [], sessionId, intent: "error" };
    }

    throw new Error("Không thể kết nối AI: " + err.message);
  }
}

export async function clearSession(sessionId) {
  await deleteSessionHistory(sessionId);
  console.log(`[Chat] Session ${sessionId} cleared.`);
}