import { pool } from "../config/database.js";

export async function getCandidateEvents(limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT e.event_id, e.event_name, e.event_location,
              e.event_start, e.event_end, e.event_artist,
              e.banner_url, c.category_name, c.category_id,
              MIN(z.zone_price) AS min_price,
              SUM(z.zone_quantity - z.sold_quantity) AS available_tickets,
              false AS is_coming_soon
       FROM events e
       JOIN categories c ON e.category_id = c.category_id
       JOIN zones z ON z.event_id = e.event_id
       WHERE e.event_status = true
         AND e.event_end >= NOW()
         AND z.status = true
       GROUP BY e.event_id, c.category_name, c.category_id
       HAVING SUM(z.zone_quantity - z.sold_quantity) > 0

       UNION ALL

       SELECT e.event_id, e.event_name, e.event_location,
              e.event_start, e.event_end, e.event_artist,
              e.banner_url, c.category_name, c.category_id,
              MIN(z.zone_price) AS min_price,
              NULL AS available_tickets,
              true AS is_coming_soon
       FROM events e
       JOIN categories c ON e.category_id = c.category_id
       LEFT JOIN zones z ON z.event_id = e.event_id
       WHERE e.event_status = false
         AND e.event_start > NOW()
         AND e.event_end >= NOW()
       GROUP BY e.event_id, c.category_name, c.category_id
     ) combined
     ORDER BY is_coming_soon ASC, event_start ASC
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
       (e.event_status = true  AND e.event_end >= NOW())
     )
     GROUP BY e.event_id, c.category_name, c.category_id
     ORDER BY
       e.event_status ASC,
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
       MIN(z.zone_price)    AS min_price,
       SUM(z.sold_quantity) AS total_sold,
       SUM(z.zone_quantity) AS total_capacity,
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
     ORDER BY sold_percent DESC, total_sold DESC, e.event_start ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getUserContext(userId) {
  const [purchaseRes, userRes] = await Promise.all([
    pool.query(
      `SELECT e.event_id, e.event_name, e.category_id,
              c.category_name, e.event_artist
       FROM payments p
       JOIN payment_detail pd ON p.payment_id = pd.payment_id
       JOIN events e          ON pd.event_id  = e.event_id
       JOIN categories c      ON e.category_id = c.category_id
       WHERE p.user_id = $1 AND p.payment_status = 'Thành công'
       ORDER BY p.payment_id DESC
       LIMIT 10`,
      [userId]
    ),
    pool.query(`SELECT favorite FROM users WHERE user_id = $1`, [userId]),
  ]);

  const purchasedEvents = purchaseRes.rows;
  const purchasedIds    = new Set(purchasedEvents.map((r) => r.event_id));
  const favorite        = userRes.rows[0]?.favorite || [];
  return { purchasedEvents, purchasedIds, favorite };
}

async function buildSemanticScoreMap(userContext, vectorStore, topK = 5) {
  const { purchasedEvents, favorite } = userContext;

  const queries = new Set();

  // ✅ FIX: mỗi keyword là 1 query riêng (KHÔNG gộp)
  favorite.forEach((f) => {
    if (f?.search) queries.add(f.search);
  });

  const cats = [...new Set(
    purchasedEvents.map((e) => e.category_name).filter(Boolean)
  )];
  cats.forEach((c) => queries.add(c));

  const artists = [
    ...new Set(
      purchasedEvents.flatMap((e) => {
        const a = e.event_artist;
        if (!a) return [];
        if (Array.isArray(a)) return a.map((x) => x?.name || x).filter(Boolean);
        return [];
      })
    ),
  ];
  artists.forEach((a) => queries.add(a));

  const names = purchasedEvents.slice(0, 5).map((e) => e.event_name).filter(Boolean);
  names.forEach((n) => queries.add(n));

  if (!queries.size) return new Map();

  const scoreAccum = new Map();
  const THRESHOLD = 0.35; // 🔥 tăng threshold để giảm noise

  await Promise.all(
    [...queries].map(async (q) => {
      try {
        const isFavoriteQuery = favorite.some((f) => f?.search === q);
        const k = isFavoriteQuery ? topK * 2 : topK;

        const results = await vectorStore.similaritySearchWithScore(q, k);

        for (const [doc, score] of results) {
          if (score < THRESHOLD) continue;

          const eventId =
            doc.metadata?.event_id ??
            (() => {
              const match = doc.pageContent.match(/\[ID[:\s]*(\d+)\]/i);
              return match ? parseInt(match[1]) : null;
            })();

          if (!eventId) continue;

          // ✅ boost favorite query
          const weightedScore = isFavoriteQuery ? score * 1.4 : score;

          const prev = scoreAccum.get(eventId) ?? { total: 0, count: 0 };
          scoreAccum.set(eventId, {
            total: prev.total + weightedScore,
            count: prev.count + 1,
          });
        }
      } catch (err) {
        console.error("Vector error:", err.message);
      }
    })
  );

  const scoreMap = new Map();
  for (const [eventId, { total, count }] of scoreAccum) {
    scoreMap.set(eventId, total / count);
  }

  return scoreMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring & ranking
//
// Trọng số:
//   favorite  0.60 — ưu tiên tuyệt đối sở thích người dùng
//   artist    0.13 — nghệ sĩ yêu thích (lịch sử mua)
//   semantic  0.15 — liên quan ngữ nghĩa (vector store)
//   category  0.12 — cùng thể loại đã mua
//
// Quy tắc filter đã mua:
//   Candidate pool đã lọc "còn bán" từ DB, nên ở đây chỉ cần quyết
//   có hiển thị lại sự kiện đã mua hay không:
//
//   case A — đã mua + còn bán + là favorite/khớp keyword favorite
//            → GIỮ LẠI, score bình thường, penalty nhỏ -0.05
//            (ví dụ: concert nhiều đêm, user favorite nghệ sĩ đó)
//
//   case B — đã mua + còn bán + KHÔNG phải favorite
//            → LOẠI BỎ (tránh trùng lặp với đơn đã có)
//
//   case C — chưa mua → luôn giữ, tính điểm bình thường
// ─────────────────────────────────────────────────────────────────────────────
function scoreAndRankCandidates(candidates, semanticScoreMap, userContext) {
  const { purchasedEvents, purchasedIds, favorite } = userContext;

  const favoriteEventIds = new Set(
    favorite.map((f) => f?.event_id).filter(Boolean)
  );

  const favoriteKeywords = new Set(
    favorite.map((f) => f?.search?.toLowerCase()).filter(Boolean)
  );

  const purchasedCategoryIds = new Set(
    purchasedEvents.map((e) => e.category_id).filter(Boolean)
  );

  const purchasedArtistNames = new Set(
    purchasedEvents.flatMap((e) => {
      const a = e.event_artist;
      if (!a) return [];
      if (Array.isArray(a))
        return a.map((x) => (x?.name || x)?.toLowerCase()).filter(Boolean);
      return [];
    })
  );

  // ✅ FIX: lấy artist từ event favorite
  const favoriteBaseEvents = candidates.filter((ev) =>
    favoriteEventIds.has(ev.event_id)
  );

  const favoriteArtists = new Set(
    favoriteBaseEvents.flatMap((ev) =>
      Array.isArray(ev.event_artist)
        ? ev.event_artist.map((a) => (a?.name || a)?.toLowerCase())
        : []
    )
  );

  // ✅ FIX: weight hợp lý hơn
  const W = {
    favorite: 0.65,
    semantic: 0.15,
    category: 0.1,
    artist: 0.1,
  };

  function matchesFavorite(ev) {
    if (favoriteEventIds.has(ev.event_id)) return true;
    if (!favoriteKeywords.size) return false;

    const evName = ev.event_name?.toLowerCase() || "";
    const evCategory = ev.category_name?.toLowerCase() || "";

    const evArtists = Array.isArray(ev.event_artist)
      ? ev.event_artist.map((a) => (a?.name || a)?.toLowerCase())
      : [];

    return [...favoriteKeywords].some((kw) => {
      const words = kw.split(" ");
      return (
        words.every((w) => evName.includes(w)) ||
        words.every((w) => evCategory.includes(w)) ||
        evArtists.some((a) => words.every((w) => a.includes(w)))
      );
    });
  }

  return candidates
    .filter((ev) => {
      if (ev.is_coming_soon) return matchesFavorite(ev);
      if (!purchasedIds.has(ev.event_id)) return true;
      return matchesFavorite(ev);
    })
    .map((ev) => {
      const isPurchased = purchasedIds.has(ev.event_id);
      const semanticScore = semanticScoreMap.get(ev.event_id) ?? 0;

      const evArtists = Array.isArray(ev.event_artist)
        ? ev.event_artist.map((a) => (a?.name || a)?.toLowerCase())
        : [];

      const isFavorite = favoriteEventIds.has(ev.event_id) ? 1 : 0;
      const keywordMatch = matchesFavorite(ev) && !isFavorite ? 1 : 0;
      const favoriteSignal = Math.max(isFavorite, keywordMatch);

      const categoryMatch = purchasedCategoryIds.has(ev.category_id) ? 1 : 0;

      const artistMatch =
        evArtists.some((a) => purchasedArtistNames.has(a)) ||
        evArtists.some((a) => favoriteArtists.has(a))
          ? 1
          : 0;

      let score =
        W.favorite * favoriteSignal +
        W.semantic * semanticScore +
        W.category * categoryMatch +
        W.artist * artistMatch;

      if (favoriteSignal && (categoryMatch || artistMatch)) {
        score += 0.1;
      }

      if (isPurchased) score -= 0.05;

      return {
        ...ev,
        _scores: {
          totalScore: score,
        },
      };
    })
    .sort((a, b) => b._scores.totalScore - a._scores.totalScore);
}

async function selectTopKWithAI(rankedCandidates, userContext, k = 10) {
  const { llm } = await import("./ragAgent.js");
  const { purchasedEvents, favorite } = userContext;

  const topCandidates = rankedCandidates.slice(0, 15);
  if (!topCandidates.length) return [];

  const eventList = topCandidates
    .map((ev) => {
      const {
        isFavorite,
        favoriteKeywordMatch,
        isFavoriteSignal,
        categoryMatch,
        artistMatch,
        overlapBonus,
        isPurchased,
        totalScore,
        semanticScore,
      } = ev._scores;

      const favLabel     = isFavorite                      ? " ⭐[YÊU THÍCH]"             : "";
      const favKwLabel   = !isFavorite && favoriteKeywordMatch ? " ⭐[KHỚP SỞ THÍCH]"     : "";
      const catLabel     = categoryMatch                   ? " 🎵[CÙNG THỂ LOẠI]"         : "";
      const artLabel     = artistMatch                     ? " 🎤[NGHỆ SĨ YÊU THÍCH]"     : "";
      const semLabel     = semanticScore > 0.1             ? " 🔥[LIÊN QUAN CAO]"         : "";
      const overlapLabel = overlapBonus > 0                ? " 💎[TRÙNG SỞ THÍCH]"        : "";
      const purchasedLabel = isPurchased                   ? " 🔁[ĐÃ MUA - CÒN VÉ]"       : "";
      const comingSoonLabel = ev._scores?.isComingSoon     ? " 🔔[SẮP MỞ BÁN]"             : "";
      const scoreStr     = (totalScore * 100).toFixed(0);

      return (
        `[ID:${ev.event_id}][Score:${scoreStr}%]${favLabel}${favKwLabel}${catLabel}${artLabel}${semLabel}${overlapLabel}${purchasedLabel}${comingSoonLabel}\n` +
        `  Tên: ${ev.event_name}\n` +
        `  Thể loại: ${ev.category_name} | ` +
        `Ngày: ${new Date(ev.event_start).toLocaleDateString("vi-VN")} | ` +
        `Từ ${Number(ev.min_price || 0).toLocaleString("vi-VN")}đ | ` +
        `${ev.is_coming_soon ? 'Mở bán lúc ' + new Date(ev.event_start).toLocaleDateString('vi-VN') : 'Còn ' + ev.available_tickets + ' vé'}`
      );
    })
    .join("\n\n");

  const historyText = purchasedEvents.length
    ? purchasedEvents.slice(0, 8).map((e) => `  • ${e.event_name} (${e.category_name})`).join("\n")
    : "  Chưa có lịch sử mua vé.";

  const favKeywords = favorite.map((f) => f?.search).filter(Boolean).join(", ") || "Không có";

  const prompt =
    `Bạn là hệ thống gợi ý sự kiện âm nhạc cá nhân hóa.\n\n` +

    `## HỒ SƠ NGƯỜI DÙNG\n` +
    `Từ khóa yêu thích: ${favKeywords}\n` +
    `Lịch sử mua vé gần đây:\n${historyText}\n\n` +

    `## QUY TẮC QUAN TRỌNG\n` +
    `- Ưu tiên CAO NHẤT: sự kiện có nhãn ⭐ (yêu thích trực tiếp hoặc khớp sở thích)\n` +
    `- Sự kiện 🔁 (đã mua nhưng còn vé, là favorite): CÓ THỂ chọn nếu điểm favorite cao\n` +
    `  → Lý do: concert nhiều đêm, user muốn mua thêm vé cùng sự kiện\n` +
    `- Sự kiện 🔔 (sắp mở bán): ĐÃ lọc sẵn = chắc chắn khớp favorite → ưu tiên cao\n` +
    `  → Hiển thị để user biết trước và chuẩn bị đặt vé sớm\n` +
    `- Đảm bảo đa dạng thể loại khi có thể, nhưng KHÔNG hy sinh favorite để đa dạng\n` +
    `- Ưu tiên: 💎 trùng sở thích > ⭐ yêu thích > 🔥 liên quan > 🎤 nghệ sĩ > 🎵 thể loại\n\n` +

    `## DANH SÁCH ỨNG VIÊN (tất cả đều còn vé)\n` +
    `${eventList}\n\n` +

    `## YÊU CẦU\n` +
    `Chọn đúng ${k} sự kiện phù hợp nhất.\n` +
    `CHỈ trả về dãy ID cách nhau bởi dấu phẩy, không giải thích.\n` +
    `Ví dụ: 3,7,1,5,2`;

  const response = await llm.invoke([{ role: "user", content: prompt }]);
  const text     = (response.content || "").trim();

  const selectedIds = text
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((id) => !isNaN(id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, k);

  return selectedIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build clean result
// Không cần filter purchasedIds ở đây — scoring đã xử lý
// ─────────────────────────────────────────────────────────────────────────────
function buildCleanResult(selectedIds, rankedCandidates) {
  const idToEvent = Object.fromEntries(
    rankedCandidates.map((e) => [e.event_id, e])
  );

  const seen = new Set();

  return selectedIds
    .filter((id) => {
      if (!idToEvent[id]) return false;
      if (seen.has(id))   return false;
      seen.add(id);
      return true;
    })
    .map((id) => {
      const { _scores, ...ev } = idToEvent[id];
      return ev;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export async function getHybridRecommendations(userId = null, limit = 20, topK = 10) {
  const safeLimit = 20;

  if (!userId) {
    const events = await getGuestEvents(safeLimit);
    return { type: "guest", events };
  }

  const [candidates, userContext] = await Promise.all([
    getCandidateEvents(50),   // chỉ sự kiện còn bán được
    getUserContext(userId),
  ]);

  if (!candidates.length) {
    return { type: "popular", events: [] };
  }

  const { purchasedEvents, favorite } = userContext;
  const hasContext = purchasedEvents.length > 0 || favorite.length > 0;

  if (!hasContext) {
    const events = await getHotEvents(safeLimit);
    return { type: "hot", events };
  }

  try {
    const { getVectorStore } = await import("./ragAgent.js");
    const vectorStore = await getVectorStore();

    const semanticScoreMap = await buildSemanticScoreMap(userContext, vectorStore, 20);
    const rankedCandidates = scoreAndRankCandidates(candidates, semanticScoreMap, userContext);

    if (!rankedCandidates.length) {
      const events = await getHotEvents(safeLimit);
      return { type: "hot", events };
    }

    const selectedIds = await selectTopKWithAI(
      rankedCandidates,
      userContext,
      safeLimit
    );

    if (!selectedIds.length) {
      console.warn("[Recommendation] AI returned no selections, falling back to hot.");
      const events = await getHotEvents(safeLimit);
      return { type: "hot", events };
    }

    const events = buildCleanResult(selectedIds, rankedCandidates);

    if (!events.length) {
      console.warn("[Recommendation] All AI-selected IDs were invalid, falling back to hot.");
      const hotEvents = await getHotEvents(safeLimit);
      return { type: "hot", events: hotEvents };
    }

    return { type: "personalized", events };

  } catch (err) {
    console.error("[Recommendation] Pipeline error:", err.message);
    const events = await getHotEvents(safeLimit);
    return { type: "hot", events };
  }
}