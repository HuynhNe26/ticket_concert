import { pool } from "../config/database.js";

export async function getCandidateEvents(limit = 50) {
  const { rows } = await pool.query(
    `SELECT e.event_id, e.event_name, e.event_location,
            e.event_start, e.event_end, e.event_artist,
            e.banner_url, c.category_name, c.category_id,
            MIN(z.zone_price) AS min_price
     FROM events e
     JOIN categories c ON e.category_id = c.category_id
     LEFT JOIN zones z ON z.event_id = e.event_id
     WHERE e.event_end >= NOW()
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

function buildUserProfileText(userContext) {
  const { purchasedEvents, favorite } = userContext;
  const parts = [];

  const favoriteEventIds = new Set(
    favorite.map((f) => f?.event_id).filter(Boolean)
  );

  const favoriteKeywords = favorite.map((f) => f?.search).filter(Boolean);

  for (const kw of favoriteKeywords) {
    parts.push(kw, kw, kw, kw);
  }

  const purchasedCategories = [
    ...new Set(purchasedEvents.map((e) => e.category_name).filter(Boolean)),
  ];

  for (const cat of purchasedCategories) {
    parts.push(cat);
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

  for (const artist of purchasedArtists) {
    parts.push(artist);
  }

  const purchasedNames = purchasedEvents.map((e) => e.event_name).filter(Boolean);
  parts.push(...purchasedNames);

  return { profileText: parts.join(", ").trim(), favoriteEventIds };
}


async function buildSemanticScoreMap(userContext, vectorStore, topK = 5) {
  const { purchasedEvents, favorite } = userContext;

  const queries = new Set();

  let favoritesQuery = "";

  const favKws = favorite.map((f) => f?.search).filter(Boolean).join(", ");
  if (favKws) {
    queries.add(favKws);
    favoritesQuery = favKws; 
  }

  const cats = [...new Set(purchasedEvents.map((e) => e.category_name).filter(Boolean))];
  if (cats.length) queries.add(cats.join(", "));

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
  if (artists.length) queries.add(artists.join(", "));

  const names = purchasedEvents.slice(0, 5).map((e) => e.event_name).filter(Boolean);
  if (names.length) queries.add(names.join(", "));

  if (!queries.size) return new Map();

  const scoreAccum = new Map();

  const THRESHOLD = 0.3;

  await Promise.all(
    [...queries].map(async (q) => {
      try {
        const isFromFavorite = q === favoritesQuery;
        const k = isFromFavorite ? topK * 2 : topK;

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

          const weightedScore = isFromFavorite ? score * 2 : score;

          const prev = scoreAccum.get(eventId) ?? { totalScore: 0, hitCount: 0 };
          scoreAccum.set(eventId, {
            totalScore: prev.totalScore + weightedScore,
            hitCount:   prev.hitCount + 1,
          });
        }
      } catch (err) {
        console.error(`[Recommendation] Vector search error for query "${q}":`, err.message);
      }
    })
  );

  const scoreMap = new Map();
  for (const [eventId, { totalScore, hitCount }] of scoreAccum) {
    scoreMap.set(eventId, totalScore / hitCount);
  }

  return scoreMap;
}

function scoreAndRankCandidates(candidates, semanticScoreMap, userContext) {
  const { purchasedEvents, purchasedIds, favorite } = userContext;

  const favoriteEventIds = new Set(favorite.map((f) => f?.event_id).filter(Boolean));

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
      if (Array.isArray(a)) return a.map((x) => (x?.name || x)?.toLowerCase()).filter(Boolean);
      return [];
    })
  );

  const W = { semantic: 0.15, favorite: 0.45, category: 0.10, artist: 0.10 };

  return candidates
    .filter((ev) => !purchasedIds.has(ev.event_id))
    .map((ev) => {
      const semanticScore  = semanticScoreMap.get(ev.event_id) ?? 0;
      const isFavorite     = favoriteEventIds.has(ev.event_id) ? 1 : 0;
      const categoryMatch  = purchasedCategoryIds.has(ev.category_id) ? 1 : 0;

      const evArtists = Array.isArray(ev.event_artist)
        ? ev.event_artist.map((a) => (a?.name || a)?.toLowerCase()).filter(Boolean)
        : [];
      const artistMatch = evArtists.some((a) => purchasedArtistNames.has(a)) ? 1 : 0;

      const evNameLower     = ev.event_name?.toLowerCase() || "";
      const evCategoryLower = ev.category_name?.toLowerCase() || "";
      const favoriteKeywordMatch = [...favoriteKeywords].some(
        (kw) => evNameLower.includes(kw) || evCategoryLower.includes(kw) ||
                evArtists.some((a) => a.includes(kw))
      ) ? 1 : 0;

      const isFavoriteSignal = Math.max(isFavorite, favoriteKeywordMatch);

      let totalScore =
        W.semantic  * semanticScore     +
        W.favorite  * isFavoriteSignal  +
        W.category  * categoryMatch     +
        W.artist    * artistMatch;

      const overlapBonus = isFavoriteSignal && (categoryMatch || artistMatch) ? 0.15 : 0;
      totalScore += overlapBonus;

      return {
        ...ev,
        _scores: {
          semanticScore,
          isFavorite,
          favoriteKeywordMatch,
          isFavoriteSignal,
          categoryMatch,
          artistMatch,
          overlapBonus,
          totalScore,
        },
      };
    })
    .sort((a, b) => b._scores.totalScore - a._scores.totalScore);
}

async function selectTopKWithAI(rankedCandidates, userContext, k = 5) {
  const { llm } = await import("./ragAgent.js");
  const { purchasedEvents, favorite } = userContext;

  const topCandidates = rankedCandidates.slice(0, 15);
  if (!topCandidates.length) return [];

  const eventList = topCandidates
    .map((ev) => {
      const {
        semanticScore,
        isFavorite,
        favoriteKeywordMatch,
        isFavoriteSignal,
        categoryMatch,
        artistMatch,
        overlapBonus,
        totalScore,
      } = ev._scores;

      const favLabel     = isFavorite         ? " ⭐[YÊU THÍCH]"         : "";
      const favKwLabel   = !isFavorite && favoriteKeywordMatch
                                              ? " ⭐[KHỚP SỞ THÍCH]"     : "";
      const catLabel     = categoryMatch       ? " 🎵[CÙNG THỂ LOẠI]"    : "";
      const artLabel     = artistMatch         ? " 🎤[NGHỆ SĨ YÊU THÍCH]": "";
      const semLabel     = semanticScore > 0.5 ? " 🔥[LIÊN QUAN CAO]"    : "";
      const overlapLabel = overlapBonus > 0    ? " 💎[TRÙNG SỞ THÍCH]"   : "";
      const scoreStr     = (totalScore * 100).toFixed(0);

      return (
        `[ID:${ev.event_id}][Score:${scoreStr}%]${favLabel}${favKwLabel}${catLabel}${artLabel}${semLabel}${overlapLabel}\n` +
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

  const prompt =
    `Bạn là hệ thống gợi ý sự kiện âm nhạc cá nhân hóa.\n\n` +

    `## HỒ SƠ NGƯỜI DÙNG\n` +
    `Từ khóa yêu thích: ${favKeywords}\n` +
    `Lịch sử mua vé gần đây:\n${historyText}\n\n` +

    `## DANH SÁCH ỨNG VIÊN (đã pre-score bằng embedding + heuristic)\n` +
    `Giải thích nhãn:\n` +
    `  ⭐ đã lưu yêu thích trực tiếp\n` +
    `  ⭐ khớp từ khóa sở thích\n` +
    `  💎 vừa khớp sở thích VÀ trùng lịch sử mua (ưu tiên cao nhất)\n` +
    `  🎵 cùng thể loại đã mua\n` +
    `  🎤 nghệ sĩ yêu thích\n` +
    `  🔥 liên quan ngữ nghĩa cao\n\n` +
    `${eventList}\n\n` +

    `## YÊU CẦU\n` +
    `Dựa trên hồ sơ người dùng và điểm sẵn có, chọn đúng ${k} sự kiện phù hợp nhất.\n` +
    `Ưu tiên theo thứ tự: 💎 trùng sở thích > ⭐ yêu thích/khớp sở thích > 🔥 liên quan > 🎤 nghệ sĩ > 🎵 thể loại.\n` +
    `Đảm bảo đa dạng thể loại nếu có thể.\n` +
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

function buildCleanResult(selectedIds, rankedCandidates, purchasedIds) {
  const idToEvent = Object.fromEntries(
    rankedCandidates.map((e) => [e.event_id, e])
  );

  const seen = new Set();

  return selectedIds
    .filter((id) => {
      if (!idToEvent[id])        return false;
      if (purchasedIds.has(id))  return false;
      if (seen.has(id))          return false;
      seen.add(id);
      return true;
    })
    .map((id) => {
      const { _scores, ...ev } = idToEvent[id];
      return ev;
    });
}

export async function getHybridRecommendations(userId = null, limit = 20, topK = 5) {
  if (!userId) {
    const events = await getGuestEvents(limit);
    return { type: "guest", events };
  }

  const [candidates, userContext] = await Promise.all([
    getCandidateEvents(50),
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

    const semanticScoreMap = await buildSemanticScoreMap(userContext, vectorStore, 20);

    const rankedCandidates = scoreAndRankCandidates(candidates, semanticScoreMap, userContext);

    if (!rankedCandidates.length) {
      const events = await getHotEvents(limit);
      return { type: "hot", events };
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