import { pool } from "../config/database.js";

// ─── 1. CANDIDATE EVENTS ─────────────────────────────────────────────────────

/**
 * FIX: Bổ sung event_status = false + event_start > NOW() để bao gồm
 * sự kiện "coming_soon" (chưa mở bán) vào pool ứng viên.
 * Trước đây chỉ lấy event_status = true → mất toàn bộ sự kiện chưa mở bán.
 */
export async function getCandidateEvents(limit = 50) {
  const { rows } = await pool.query(
    `SELECT e.event_id, e.event_name, e.event_location,
            e.event_start, e.event_end, e.event_artist,
            e.banner_url, c.category_name, c.category_id,
            e.event_status,
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
       -- Sự kiện đang active và chưa kết thúc
       (e.event_status = true AND e.event_end >= NOW())
       OR
       -- Sự kiện chưa mở bán nhưng sắp diễn ra (coming_soon)
       (e.event_status = false AND e.event_start > NOW())
     )
     GROUP BY e.event_id, c.category_name, c.category_id
     ORDER BY e.event_status DESC, e.event_start ASC
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

// ─── 2. LẤY CONTEXT USER ─────────────────────────────────────────────────────
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
       LIMIT 20`,
      [userId]
    ),
    pool.query(`SELECT favorite FROM users WHERE user_id = $1`, [userId]),
  ]);

  const purchasedEvents = purchaseRes.rows;
  const purchasedIds    = new Set(purchasedEvents.map((r) => r.event_id));
  const favorite        = userRes.rows[0]?.favorite || [];
  return { purchasedEvents, purchasedIds, favorite };
}

/**
 * FIX: Tách rõ favoriteEventIds và favoriteKeywords.
 * Trước đây favoriteKeywords không được dùng đúng cách để boost semantic score.
 */
function buildUserProfileText(userContext) {
  const { purchasedEvents, favorite } = userContext;
  const parts = [];

  const favoriteEventIds = new Set(
    favorite.map((f) => f?.event_id).filter(Boolean)
  );

  const favoriteKeywords = favorite.map((f) => f?.search).filter(Boolean);
  // Tăng trọng số keyword yêu thích x3
  for (const kw of favoriteKeywords) {
    parts.push(kw, kw, kw);
  }

  const purchasedCategories = [
    ...new Set(purchasedEvents.map((e) => e.category_name).filter(Boolean)),
  ];
  // x2
  for (const cat of purchasedCategories) {
    parts.push(cat, cat);
  }

  const purchasedArtists = [
    ...new Set(
      purchasedEvents.flatMap((e) => {
        const a = e.event_artist;
        if (!a) return [];
        if (Array.isArray(a)) return a.map((x) => x?.name || x).filter(Boolean);
        return [];
      })
    ),
  ];
  // x2
  for (const artist of purchasedArtists) {
    parts.push(artist, artist);
  }

  // Tên sự kiện đã mua x1
  const purchasedNames = purchasedEvents.map((e) => e.event_name).filter(Boolean);
  parts.push(...purchasedNames);

  return { profileText: parts.join(", ").trim(), favoriteEventIds };
}

/**
 * FIX #1: Hạ THRESHOLD từ 0.25 → 0.15 để tránh bỏ sót sự kiện liên quan
 *         khi embedding space có khoảng cách lớn hơn dự kiến.
 *
 * FIX #2: Tăng topK lên 30 (từ 20) để mỗi query có cơ hội tìm được nhiều
 *         sự kiện Anh Trai / Gill hơn trước khi lọc theo threshold.
 *
 * FIX #3: Thêm query riêng cho từng event đã mua (event_name) để tăng recall
 *         — trước đây chỉ join 5 tên thành 1 query → nhiễu ngữ nghĩa.
 *
 * FIX #4: Tách favorite search keywords thành query RIÊNG BIỆT từng keyword
 *         thay vì join hết thành 1 string → tránh mất tín hiệu khi keyword
 *         "Gill" bị "chìm" trong chuỗi dài.
 */
async function buildSemanticScoreMap(userContext, vectorStore, topK = 30) {
  const { purchasedEvents, favorite } = userContext;

  const queries = new Set();

  // FIX: Tách từng keyword yêu thích thành query riêng (không join thành 1 string)
  const favKws = favorite.map((f) => f?.search).filter(Boolean);
  for (const kw of favKws) {
    queries.add(kw); // "Gill", "Anh Trai" → 2 queries riêng biệt
  }

  // Category query (vẫn join vì cùng domain)
  const cats = [...new Set(purchasedEvents.map((e) => e.category_name).filter(Boolean))];
  if (cats.length) queries.add(cats.join(", "));

  // Artist queries — tách riêng từng nghệ sĩ
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
  for (const artist of artists) {
    queries.add(artist); // mỗi nghệ sĩ 1 query riêng
  }

  // FIX: Tách từng event name đã mua thành query riêng (không join thành 1 string)
  // Giới hạn 8 event gần nhất để không quá nhiều queries
  const names = purchasedEvents.slice(0, 8).map((e) => e.event_name).filter(Boolean);
  for (const name of names) {
    queries.add(name);
  }

  if (!queries.size) return new Map();

  const scoreAccum = new Map();

  // FIX: Hạ threshold để tránh bỏ sót
  const THRESHOLD = 0.15;

  await Promise.all(
    [...queries].map(async (q) => {
      try {
        const results = await vectorStore.similaritySearchWithScore(q, topK);
        for (const [doc, score] of results) {
          if (score < THRESHOLD) continue;

          const eventId =
            doc.metadata?.event_id ??
            (() => {
              const match = doc.pageContent.match(/\[ID[:\s]*(\d+)\]/i);
              return match ? parseInt(match[1]) : null;
            })();

          if (!eventId) continue;

          const prev = scoreAccum.get(eventId) ?? { totalScore: 0, hitCount: 0 };
          scoreAccum.set(eventId, {
            totalScore: prev.totalScore + score,
            hitCount:   prev.hitCount + 1,
          });
        }
      } catch (err) {
        console.error(`[Recommendation] Vector search error for query "${q}":`, err.message);
      }
    })
  );

  // Dùng weighted average: nhiều hit → tin cậy hơn
  const scoreMap = new Map();
  for (const [eventId, { totalScore, hitCount }] of scoreAccum) {
    // FIX: Thay vì average thuần, boost thêm theo số lần xuất hiện (hitCount)
    // Score = avg * log(1 + hitCount) để reward sự kiện xuất hiện nhiều lần
    const avgScore = totalScore / hitCount;
    const boostedScore = avgScore * Math.log1p(hitCount);
    scoreMap.set(eventId, boostedScore);
  }

  return scoreMap;
}

/**
 * FIX: Bổ sung boost cho sự kiện có keyword yêu thích khớp với tên/artist
 *      ngay trong bước heuristic scoring (không phụ thuộc hoàn toàn vào vector).
 *
 * FIX: Tăng trọng số semantic từ 0.45 → 0.40 và dành 0.15 cho keyword boost mới.
 * Bảng trọng số mới:
 *   semantic   : 0.40  (giảm nhẹ để nhường chỗ cho keyword)
 *   keywordHit : 0.20  (MỚI: tên/artist sự kiện chứa keyword yêu thích)
 *   favorite   : 0.20  (giữ nguyên)
 *   category   : 0.12  (giảm nhẹ)
 *   artist     : 0.08  (giảm nhẹ)
 */
function scoreAndRankCandidates(candidates, semanticScoreMap, userContext) {
  const { purchasedEvents, purchasedIds, favorite } = userContext;

  const favoriteEventIds = new Set(favorite.map((f) => f?.event_id).filter(Boolean));

  // FIX: Lấy keywords dưới dạng lowercase để match tên sự kiện
  const favoriteKeywordsLower = favorite
    .map((f) => f?.search?.toLowerCase())
    .filter(Boolean);

  const purchasedCategoryIds = new Set(
    purchasedEvents.map((e) => e.category_id).filter(Boolean)
  );

  const purchasedArtistNames = new Set(
    purchasedEvents.flatMap((e) => {
      const a = e.event_artist;
      if (!a) return [];
      if (Array.isArray(a)) return a.map((x) => (x?.name || x)?.toLowerCase()).filter(Boolean);
      return [];
    })
  );

  // Trọng số mới
  const W = {
    semantic:   0.40,
    keywordHit: 0.20, // MỚI
    favorite:   0.20,
    category:   0.12,
    artist:     0.08,
  };

  return candidates
    .filter((ev) => !purchasedIds.has(ev.event_id))
    .map((ev) => {
      const semanticScore = semanticScoreMap.get(ev.event_id) ?? 0;
      const isFavorite    = favoriteEventIds.has(ev.event_id) ? 1 : 0;
      const categoryMatch = purchasedCategoryIds.has(ev.category_id) ? 1 : 0;

      const evArtists = Array.isArray(ev.event_artist)
        ? ev.event_artist.map((a) => (a?.name || a)?.toLowerCase()).filter(Boolean)
        : [];
      const artistMatch = evArtists.some((a) => purchasedArtistNames.has(a)) ? 1 : 0;

      // FIX: keyword match — kiểm tra xem tên sự kiện hoặc artist có chứa
      // keyword yêu thích không (fuzzy contains)
      const evNameLower = (ev.event_name || "").toLowerCase();
      const evArtistStr = evArtists.join(" ");
      const keywordHit = favoriteKeywordsLower.some(
        (kw) => evNameLower.includes(kw) || evArtistStr.includes(kw)
      ) ? 1 : 0;

      const totalScore =
        W.semantic   * semanticScore +
        W.keywordHit * keywordHit    +
        W.favorite   * isFavorite    +
        W.category   * categoryMatch +
        W.artist     * artistMatch;

      return {
        ...ev,
        _scores: {
          semanticScore,
          keywordHit,
          isFavorite,
          categoryMatch,
          artistMatch,
          totalScore,
        },
      };
    })
    .sort((a, b) => b._scores.totalScore - a._scores.totalScore);
}

/**
 * FIX #1: Tăng topCandidates từ 15 → 25 để AI có pool đủ lớn,
 *         tránh cắt mất các sự kiện Anh Trai nếu chúng ở vị trí 16-20.
 *
 * FIX #2: Highlight rõ hơn trong prompt khi sự kiện có keywordHit
 *         để AI ưu tiên đúng.
 *
 * FIX #3: Thêm thông tin "coming_soon" vào prompt để AI biết và không
 *         bỏ qua sự kiện chưa mở bán.
 */
async function selectTopKWithAI(rankedCandidates, userContext, k = 5) {
  const { llm } = await import("./ragAgent.js");
  const { purchasedEvents, favorite } = userContext;

  // FIX: Tăng từ 15 → 25
  const topCandidates = rankedCandidates.slice(0, 25);
  if (!topCandidates.length) return [];

  const eventList = topCandidates
    .map((ev) => {
      const {
        semanticScore,
        keywordHit,
        isFavorite,
        categoryMatch,
        artistMatch,
        totalScore,
      } = ev._scores;

      const favLabel  = isFavorite    ? " ⭐[YÊU THÍCH]"         : "";
      const catLabel  = categoryMatch ? " 🎵[CÙNG THỂ LOẠI]"     : "";
      const artLabel  = artistMatch   ? " 🎤[NGHỆ SĨ YÊU THÍCH]" : "";
      const semLabel  = semanticScore > 0.4 ? " 🔥[LIÊN QUAN CAO]" : "";
      // FIX: Thêm label keyword hit
      const kwLabel   = keywordHit    ? " 🔑[TỪ KHÓA YÊU THÍCH]" : "";
      // FIX: Thêm label coming_soon
      const csLabel   = ev.event_label === "coming_soon" ? " 🔜[COMING SOON]" : "";
      const scoreStr  = (totalScore * 100).toFixed(0);

      return (
        `[ID:${ev.event_id}][Score:${scoreStr}%]${favLabel}${kwLabel}${catLabel}${artLabel}${semLabel}${csLabel}\n` +
        `  Tên: ${ev.event_name}\n` +
        `  Thể loại: ${ev.category_name} | ` +
        `Ngày: ${new Date(ev.event_start).toLocaleDateString("vi-VN")} | ` +
        `Từ ${Number(ev.min_price || 0).toLocaleString("vi-VN")}đ`
      );
    })
    .join("\n\n");

  const historyText = purchasedEvents.length
    ? purchasedEvents.slice(0, 8).map((e) => `  • ${e.event_name} (${e.category_name})`).join("\n")
    : "  Chưa có lịch sử mua vé.";

  const favKeywords = favorite.map((f) => f?.search).filter(Boolean).join(", ") || "Không có";

  // FIX: Cập nhật prompt để ưu tiên rõ ràng hơn cho keyword và coming_soon
  const prompt =
    `Bạn là hệ thống gợi ý sự kiện âm nhạc cá nhân hóa.\n\n` +

    `## HỒ SƠ NGƯỜI DÙNG\n` +
    `Từ khóa yêu thích: ${favKeywords}\n` +
    `Lịch sử mua vé gần đây:\n${historyText}\n\n` +

    `## DANH SÁCH ỨNG VIÊN (đã pre-score bằng embedding + heuristic)\n` +
    `Giải thích nhãn:\n` +
    `  ⭐ đã lưu yêu thích\n` +
    `  🔑 tên/nghệ sĩ khớp từ khóa yêu thích của user — ƯU TIÊN CAO NHẤT\n` +
    `  🔥 liên quan ngữ nghĩa cao\n` +
    `  🎤 nghệ sĩ yêu thích\n` +
    `  🎵 cùng thể loại đã mua\n` +
    `  🔜 sự kiện sắp mở bán — vẫn nên gợi ý để user chuẩn bị\n\n` +
    `${eventList}\n\n` +

    `## YÊU CẦU\n` +
    `Chọn đúng ${k} sự kiện phù hợp nhất với user.\n` +
    `Thứ tự ưu tiên: 🔑 từ khóa khớp > ⭐ yêu thích > 🔥 liên quan > 🎤 nghệ sĩ > 🎵 thể loại.\n` +
    `Nếu có nhiều sự kiện cùng series (ví dụ: nhiều show "Anh Trai"), hãy chọn TẤT CẢ các show đó trước khi xét đến sự kiện khác.\n` +
    `Sự kiện 🔜 COMING SOON vẫn có thể được chọn — user nên biết để chuẩn bị mua vé.\n` +
    `Đảm bảo đa dạng nếu không có đủ sự kiện cùng từ khóa.\n` +
    `CHỈ trả về dãy ID cách nhau bởi dấu phẩy, không giải thích thêm.\n` +
    `Ví dụ: 3,7,1,5,2`;

  const response  = await llm.invoke([{ role: "user", content: prompt }]);
  const text      = (response.content || "").trim();

  const selectedIds = text
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((id) => !isNaN(id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, k);

  return selectedIds;
}

/**
 * FIX: buildCleanResult — coming_soon events không bị lọc bởi purchasedIds
 * (purchasedIds chỉ chứa event đã mua thành công, coming_soon chưa mua được)
 * → logic đã đúng, không cần thay đổi.
 */
function buildCleanResult(selectedIds, rankedCandidates, purchasedIds) {
  const idToEvent = Object.fromEntries(
    rankedCandidates.map((e) => [e.event_id, e])
  );

  const seen = new Set();

  return selectedIds
    .filter((id) => {
      if (!idToEvent[id])       return false;
      if (purchasedIds.has(id)) return false;
      if (seen.has(id))         return false;
      seen.add(id);
      return true;
    })
    .map((id) => {
      const { _scores, ...ev } = idToEvent[id];
      return ev;
    });
}

/**
 * FIX: Tăng topK từ 5 → 8 trong getHybridRecommendations để trả về nhiều
 *      sự kiện Anh Trai / Gill hơn khi có nhiều show cùng series.
 *
 * FIX: Tăng limit candidate từ 50 → 60 để có pool rộng hơn,
 *      đặc biệt sau khi đã bao gồm coming_soon events.
 */
export async function getHybridRecommendations(userId = null, limit = 20, topK = 8) {
  if (!userId) {
    const events = await getGuestEvents(limit);
    return { type: "guest", events };
  }

  const [candidates, userContext] = await Promise.all([
    // FIX: Tăng limit candidate pool
    getCandidateEvents(60),
    getUserContext(userId),
  ]);

  if (!candidates.length) {
    return { type: "popular", events: [] };
  }

  const { purchasedEvents, purchasedIds, favorite } = userContext;
  const hasContext = purchasedEvents.length > 0 || favorite.length > 0;

  if (!hasContext) {
    const events = await getHotEvents(limit);
    return { type: "hot", events };
  }

  try {
    const { getVectorStore } = await import("./ragAgent.js");
    const vectorStore = await getVectorStore();

    // FIX: Tăng topK vector search từ 20 → 30
    const semanticScoreMap = await buildSemanticScoreMap(userContext, vectorStore, 30);

    const rankedCandidates = scoreAndRankCandidates(
      candidates,
      semanticScoreMap,
      userContext
    );

    if (!rankedCandidates.length) {
      const events = await getHotEvents(limit);
      return { type: "hot", events };
    }

    // Debug log để kiểm tra scoring (xóa khi production)
    if (process.env.NODE_ENV !== "production") {
      console.log("[Recommendation] Top 10 ranked candidates:");
      rankedCandidates.slice(0, 10).forEach((ev, i) => {
        console.log(
          `  ${i + 1}. [ID:${ev.event_id}] ${ev.event_name}`,
          JSON.stringify(ev._scores)
        );
      });
    }

    const selectedIds = await selectTopKWithAI(rankedCandidates, userContext, topK);

    if (!selectedIds.length) {
      console.warn("[Recommendation] AI returned no selections, falling back to hot.");
      const events = await getHotEvents(limit);
      return { type: "hot", events };
    }

    const events = buildCleanResult(selectedIds, rankedCandidates, purchasedIds);

    if (!events.length) {
      console.warn("[Recommendation] All AI-selected IDs were invalid, falling back to hot.");
      const hotEvents = await getHotEvents(limit);
      return { type: "hot", events: hotEvents };
    }

    return { type: "personalized", events };

  } catch (err) {
    console.error("[Recommendation] Pipeline error:", err.message);
    const events = await getHotEvents(limit);
    return { type: "hot", events };
  }
}