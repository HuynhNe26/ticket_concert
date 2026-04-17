import { pool } from "../config/database.js";

// ─── 1. CANDIDATE EVENTS ─────────────────────────────────────────────────────
export async function getCandidateEvents(limit = 50) {
  const { rows } = await pool.query(
    `SELECT e.event_id, e.event_name, e.event_location,
            e.event_start, e.event_end, e.event_artist,
            e.banner_url, c.category_name, c.category_id,
            MIN(z.zone_price) AS min_price
     FROM events e
     JOIN categories c ON e.category_id = c.category_id
     LEFT JOIN zones z ON z.event_id = e.event_id
     WHERE e.event_status = true
       AND e.event_end >= NOW()
     GROUP BY e.event_id, c.category_name, c.category_id
     ORDER BY e.event_start ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getGuestEvents(limit = 10) {
  const { rows } = await pool.query(
    `SELECT e.event_id, e.event_name, e.event_location,
            e.event_start, e.event_end, e.event_artist,
            e.banner_url, c.category_name, c.category_id,
            MIN(z.zone_price) AS min_price,
            CASE
              WHEN e.event_status = false AND e.event_start > NOW()
                THEN 'coming_soon'
              WHEN e.event_status = true AND e.event_start > NOW()
                THEN 'upcoming'
              WHEN e.event_status = true
               AND e.event_start <= NOW()
               AND e.event_end   >= NOW()
                THEN 'ongoing'
            END AS event_label
     FROM events e
     JOIN categories c ON e.category_id = c.category_id
     LEFT JOIN zones z ON z.event_id = e.event_id
     WHERE (
       (e.event_status = false AND e.event_start > NOW())
       OR
       (e.event_status = true  AND e.event_end   >= NOW())
     )
     GROUP BY e.event_id, c.category_name, c.category_id
     ORDER BY
       e.event_status ASC,      -- đang/sắp diễn ra lên trước
       e.event_start  ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}   

export async function getHotEvents(limit = 10) {
  const { rows } = await pool.query(
    `SELECT
       e.event_id, e.event_name, e.event_location,
       e.event_start, e.event_end, e.event_artist,
       e.banner_url, c.category_name, c.category_id,
       MIN(z.zone_price)   AS min_price,
       SUM(z.sold_quantity)  AS total_sold,
       SUM(z.zone_quantity)  AS total_capacity,
       CASE
         WHEN SUM(z.zone_quantity) > 0
           THEN ROUND(
             SUM(z.sold_quantity)::numeric
             / SUM(z.zone_quantity)::numeric * 100, 1
           )
         ELSE 0
       END AS sold_percent
     FROM events e
     JOIN categories c ON e.category_id = c.category_id
     JOIN zones z       ON z.event_id   = e.event_id
     WHERE e.event_status = true
       AND e.event_end   >= NOW()
       AND z.status       = true
     GROUP BY e.event_id, c.category_name, c.category_id
     HAVING SUM(z.zone_quantity) > 0
     ORDER BY
       sold_percent DESC,   -- tỉ lệ bán cao → hot nhất
       total_sold   DESC,   -- cùng % → tổng vé bán nhiều hơn lên trước  
       e.event_start ASC    -- cùng độ hot → sự kiện diễn sớm hơn lên trước
     LIMIT $1`,
    [limit]
  );
  return rows;
}

// ─── 2. LẤY CONTEXT USER (đơn hàng + favorite) ───────────────────────────────
async function getUserContext(userId) {
  const [purchaseRes, userRes] = await Promise.all([
    pool.query(
      `SELECT e.event_id, e.event_name, e.category_id,
              c.category_name, e.event_artist
       FROM payments p
       JOIN payment_detail pd ON p.payment_id = pd.payment_id
       JOIN events e ON pd.event_id = e.event_id
       JOIN categories c ON e.category_id = c.category_id
       WHERE p.user_id = $1 AND p.payment_status = 'Thành công'
       ORDER BY p.payment_id DESC
       LIMIT 20`,
      [userId]
    ),
    pool.query(`SELECT favorite FROM users WHERE user_id = $1`, [userId]),
  ]);

  const purchasedEvents = purchaseRes.rows;
  const purchasedIds = new Set(purchasedEvents.map((r) => r.event_id));
  const favorite = userRes.rows[0]?.favorite || [];
  return { purchasedEvents, purchasedIds, favorite };
}

// ─── 3. AI ANALYSIS & TOP-K SELECTION ────────────────────────────────────────
// ─── 3. AI ANALYSIS & TOP-K SELECTION ────────────────────────────────────────
async function selectTopKWithAI(candidates, userContext, k = 5) {
  const { llm, getVectorStore } = await import("./ragAgent.js");

  const { purchasedEvents, purchasedIds, favorite } = userContext;

  // ── Build query string từ context user để embed ───────────────────────────
  const favoriteKeywords = favorite
    .map((f) => f?.search)
    .filter(Boolean);

  const favoriteEventIds = new Set(
    favorite.map((f) => f?.event_id).filter(Boolean)
  );

  const purchasedCategories = [
    ...new Set(purchasedEvents.map((e) => e.category_name).filter(Boolean)),
  ];

  const purchasedArtists = [
    ...new Set(
      purchasedEvents.flatMap((e) => {
        const artist = e.event_artist;
        if (!artist) return [];
        if (Array.isArray(artist)) return artist.map((a) => a?.name || a).filter(Boolean);
        return [];
      })
    ),
  ];

  // Câu query ghép từ sở thích + lịch sử để tìm semantic
  const semanticQuery = [
    ...favoriteKeywords,
    ...purchasedCategories,
    ...purchasedArtists,
  ]
    .join(", ")
    .trim();

  // ── RAG: tìm document liên quan nếu có context ────────────────────────────
  let ragContext = "";
  if (semanticQuery) {
    try {
      const vectorStore = await getVectorStore();
      const ragResults = await vectorStore.similaritySearchWithScore(semanticQuery, 5);
      const relevant = ragResults.filter(([, score]) => score >= 0.3);

      if (relevant.length > 0) {
        ragContext =
          "\nTHÔNG TIN BỔ SUNG TỪ HỆ THỐNG:\n" +
          relevant
            .map(([doc], i) => `[${i + 1}] ${doc.pageContent.slice(0, 300)}`)
            .join("\n---\n");
      }
    } catch (err) {
      console.error("[Recommendation] RAG search error:", err.message);
      // Không throw — tiếp tục mà không có RAG context
    }
  }

  // ── Danh sách ứng viên (loại trừ event đã mua) ────────────────────────────
  const filteredCandidates = candidates.filter(
    (ev) => !purchasedIds.has(ev.event_id)
  );

  if (!filteredCandidates.length) return [];

  const eventList = filteredCandidates
    .map((ev) => {
      const isFav = favoriteEventIds.has(ev.event_id) ? " ⭐ [YÊU THÍCH]" : "";
      return (
        `[ID:${ev.event_id}]${isFav} ${ev.event_name} | ${ev.category_name} | ` +
        `${new Date(ev.event_start).toLocaleDateString("vi-VN")} | ` +
        `từ ${Number(ev.min_price || 0).toLocaleString("vi-VN")}đ`
      );
    })
    .join("\n");

  const historyText = purchasedEvents.length
    ? purchasedEvents.map((e) => `- ${e.event_name} (${e.category_name})`).join("\n")
    : "Chưa có lịch sử mua vé.";

  const favoriteText = favoriteKeywords.join(", ") || "Không có";

  // ── Prompt ghép đủ 3 nguồn: lịch sử + favorite + RAG context ─────────────
  const prompt =
    `Bạn là hệ thống gợi ý sự kiện âm nhạc. Hãy phân tích sở thích người dùng và chọn ${k} sự kiện phù hợp nhất.\n\n` +
    `LỊCH SỬ MUA VÉ:\n${historyText}\n\n` +
    `TỪ KHÓA YÊU THÍCH: ${favoriteText}\n` +
    `LƯU Ý: Các sự kiện đánh dấu ⭐ [YÊU THÍCH] là sự kiện user đã lưu — ưu tiên cao nhất.\n` +
    `${ragContext}\n\n` +
    `DANH SÁCH SỰ KIỆN ỨNG VIÊN:\n${eventList}\n\n` +
    `Yêu cầu:\n` +
    `- Chọn đúng ${k} sự kiện phù hợp nhất với sở thích người dùng\n` +
    `- Ưu tiên: phù hợp thể loại/nghệ sĩ yêu thích, đa dạng, ngày diễn sắp tới\n` +
    `- CHỈ trả về dãy ID cách nhau bởi dấu phẩy, không giải thích\n` +
    `- Ví dụ: 3,7,1,5,2`;

  const response = await llm.invoke([{ role: "user", content: prompt }]);
  const text = (response.content || "").trim();

  const selectedIds = text
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((id) => !isNaN(id))
    .filter((id, index, arr) => arr.indexOf(id) === index) // dedup
    .slice(0, k);

  return selectedIds;
}

// ─── 4. LỌC VÀ SẮP XẾP KẾT QUẢ ──────────────────────────────────────────────
function filterAndBuildResult(selectedIds, candidates, purchasedIds, k) {
  const idToEvent = Object.fromEntries(
    candidates.map((e) => [e.event_id, e])
  );

  const seen = new Set(); // chặn trùng lần 2

  const result = selectedIds
    .filter((id) => idToEvent[id] && !purchasedIds.has(id) && !seen.has(id))
    .map((id) => {
      seen.add(id);
      return idToEvent[id];
    });

  if (result.length < k) {
    const extras = candidates
      .filter((e) => !seen.has(e.event_id) && !purchasedIds.has(e.event_id))
      .slice(0, k - result.length);
    result.push(...extras);
  }

  return result;
}

// ─── 5. MAIN RECOMMENDER ─────────────────────────────────────────────────────
export async function getHybridRecommendations(userId = null, limit = 20, topK = 5) {
  const candidates = await getCandidateEvents(50);

  if (!candidates.length) {
    return { type: "popular", events: [] };
  }

  // Fallback: chưa đăng nhập
  if (!userId) {
    const events = await getGuestEvents(limit);
    return { type: "guest", events };
  }

  // Lấy context user
  const userContext = await getUserContext(userId);
  const { purchasedEvents, purchasedIds, favorite } = userContext;

  // Fallback: user chưa có dữ liệu nào
  const hasContext = purchasedEvents.length > 0 || favorite.length > 0;
  if (!hasContext) {
    const events = await getHotEvents(limit);
    return { type: "hot", events };
  }

  try {
    const selectedIds = await selectTopKWithAI(candidates, userContext, topK);

    if (!selectedIds.length) {
      const events = await getHotEvents(limit);
      return { type: "hot", events };
    }

    const events = filterAndBuildResult(selectedIds, candidates, purchasedIds, topK);

    // ✅ Sau khi filter vẫn không có kết quả → fallback hot
    if (!events.length) {
      const hotEvents = await getHotEvents(limit);
      return { type: "hot", events: hotEvents };
    }

    return { type: "personalized", events };
  } catch (err) {
    console.error("[Recommendation] AI error:", err.message);
    // ✅ AI lỗi hoàn toàn → fallback hot thay vì candidates thô
    const events = await getHotEvents(limit);
    return { type: "hot", events };
  }
}