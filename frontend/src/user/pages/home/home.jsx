import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Warning from "../../components/notification/warning/warning.jsx";
import ErrorNotif from "../../components/notification/error/error.jsx";
import "./home.css";

const API_BASE = process.env.REACT_APP_API_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Helper: đọc danh sách event_id đã xem từ localStorage ──────────────────
function getRecentEventIds() {
  try {
    const raw = localStorage.getItem("recent_event_ids");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function HomePageSkeleton() {
  const SkCard = () => (
    <div className="hw-skeleton-card">
      <div className="hw-sk hw-sk-thumb" />
      <div style={{ padding: "8px 0" }}>
        <div className="hw-sk" style={{ height: 12, width: "85%", marginBottom: 6 }} />
        <div className="hw-sk" style={{ height: 10, width: "55%", marginBottom: 4 }} />
        <div className="hw-sk" style={{ height: 10, width: "40%" }} />
      </div>
    </div>
  );

  return (
    <div className="hw-page">
      <div className="hw-section">
        <div className="hw-sk hw-sk-banner" />
      </div>

      <section className="hw-section">
        <div className="hw-sk" style={{ height: 18, width: 180, marginBottom: 16 }} />
        <div className="hw-skeleton-row">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="hw-skeleton-card hw-sk"
              style={{ aspectRatio: "3/2", height: "auto" }}
            />
          ))}
        </div>
      </section>

      {[...Array(2)].map((_, s) => (
        <section key={s} className="hw-section">
          <div className="hw-sk" style={{ height: 18, width: 220, marginBottom: 16 }} />
          <div className="hw-skeleton-row">
            {[...Array(4)].map((_, i) => <SkCard key={i} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── HSlider ──────────────────────────────────────────────────────────────────
function HSlider({ children, className = "" }) {
  const viewportRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const justSwipedRef = useRef(false);

  const scroll = (dir) => {
    if (!viewportRef.current) return;
    const width = viewportRef.current.clientWidth;
    viewportRef.current.scrollBy({
      left: dir * width,
      behavior: "smooth",
    });
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (!viewportRef.current) return;
    isDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX || e.clientX;
    startScrollLeftRef.current = viewportRef.current.scrollLeft;
  };

  const handlePointerMove = (e) => {
    if (!isDownRef.current || !viewportRef.current) return;
    const currentX = e.pageX || e.clientX;
    const diff = currentX - startXRef.current;
    if (Math.abs(diff) > 5) {
      hasMovedRef.current = true;
      viewportRef.current.classList.add("is-dragging");
      viewportRef.current.scrollLeft = startScrollLeftRef.current - diff;
    }
  };

  const handlePointerUp = () => {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    if (viewportRef.current) {
      viewportRef.current.classList.remove("is-dragging");
    }
    if (hasMovedRef.current) {
      justSwipedRef.current = true;
      setTimeout(() => {
        justSwipedRef.current = false;
      }, 150);
    }
  };

  const handleClickCapture = (e) => {
    if (hasMovedRef.current || justSwipedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return (
    <div className={`hslider ${className}`}>
      <button
        className="hslider-arrow hslider-prev"
        onClick={() => scroll(-1)}
        aria-label="Trước"
      >
        ‹
      </button>

      <div
        ref={viewportRef}
        className="hslider-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        <div className="hslider-track">
          {children}
        </div>
      </div>

      <button
        className="hslider-arrow hslider-next"
        onClick={() => scroll(1)}
        aria-label="Sau"
      >
        ›
      </button>
    </div>
  );
}

// ─── BannerCarousel ───────────────────────────────────────────────────────────
function BannerCarousel({ items, formatDate }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 1024 : false
  );
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const total = items?.length || 0;

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const goTo = (i) => {
    if (!total) return;
    setActive((i + total) % total);
  };

  useEffect(() => {
    if (total <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % total);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [total, isPaused]);

  if (!total) return null;

  // On Mobile / Tablet (< 1024px): 1 slide full-width
  // On Desktop (>= 1024px): 2 slides side-by-side
  const visibleItems = isMobileOrTablet || total === 1
    ? [items[active % total]]
    : [items[active % total], items[(active + 1) % total]];

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
    touchStartYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const endY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const diffX = touchStartXRef.current - endX;
    const diffY = touchStartYRef.current - endY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) goTo(active + 1);
      else goTo(active - 1);
    }
  };

  return (
    <div
      className="banner-carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <button className="banner-arrow left" onClick={() => goTo(active - 1)} aria-label="Trước">‹</button>
      <div className={`banner-slides ${isMobileOrTablet ? "single-slide" : "two-slides"}`}>
        {visibleItems.map((item, idx) => (
          <div
            key={`${item.event_id}-${active}-${idx}`}
            className="banner-slide"
            onClick={() => navigate(`/event/${item.event_id}`)}
          >
            <img src={item.banner_url} alt={item.event_name} loading="lazy" />
            <div className="banner-overlay">
              <div className="banner-info">
                <span className="banner-badge">Sự kiện nổi bật</span>
                <h3 className="banner-title" title={item.event_name}>{item.event_name}</h3>
                <div className="banner-meta-row">
                  {item.event_start && (
                    <span className="banner-date">
                      📅 {formatDate ? formatDate(item.event_start) : new Date(item.event_start).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                  <button
                    className="banner-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/event/${item.event_id}`);
                    }}
                  >
                    <span>Xem chi tiết</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="banner-cta-arrow">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="banner-arrow right" onClick={() => goTo(active + 1)} aria-label="Sau">›</button>
      <div className="banner-dots">
        {items.map((_, i) => (
          <span key={i} className={`banner-dot ${i === active ? "active" : ""}`} onClick={() => goTo(i)} />
        ))}
      </div>
    </div>
  );
}

function RecommendBadge({ type }) {
  if (type === "personalized") {
    return <span className="hw-rec-badge hw-rec-badge--personal">✦</span>;
  }
  return null;
}

// ─── Category Meta Helper ───────────────────────────────────────────────────
const CATEGORY_META = {
  "ca nhạc": { icon: "🎵", color: "#38bdf8", border: "rgba(56, 189, 248, 0.4)" },
  "đại hội": { icon: "🎪", color: "#fb923c", border: "rgba(251, 146, 60, 0.4)" },
  "kịch": { icon: "🎭", color: "#c084fc", border: "rgba(192, 132, 252, 0.4)" },
};

function getCategoryMeta(name) {
  if (!name) return { icon: "🎫", color: "#22c55e", border: "rgba(34, 197, 94, 0.4)" };
  const lower = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_META)) {
    if (lower.includes(key)) return val;
  }
  return { icon: "🎫", color: "#22c55e", border: "rgba(34, 197, 94, 0.4)" };
}

// ─── EventCard ────────────────────────────────────────────────────────────────
function EventCard({ ev, onClick, formatCurrency, formatDate }) {
  const meta = getCategoryMeta(ev.category_name);
  return (
    <div className="ev-card" onClick={onClick}>
      <div className="ev-card-thumb">
        <img src={ev.banner_url} alt={ev.event_name} loading="lazy" />
        {ev.category_name && (
          <span className="ev-card-cat-badge" style={{ borderColor: meta.border }}>
            <span className="ev-card-cat-icon">{meta.icon}</span>
            <span>{ev.category_name}</span>
          </span>
        )}
      </div>
      <div className="ev-card-body">
        <p className="ev-card-title">{ev.event_name}</p>
        <p className="ev-card-price">Từ {formatCurrency(ev.min_price || 0)}</p>
        <p className="ev-card-date">
          <span className="ev-card-cal">📅</span>
          {formatDate(ev.event_end || ev.event_start)}
        </p>
      </div>
    </div>
  );
}

// ─── HomeUser ─────────────────────────────────────────────────────────────────
export default function HomeUser() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [trending, setTrendings] = useState([]);
  const [eventMonth, setEventMonths] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [eventWeeks, setEventWeeks] = useState([]);
  const [oldOrders, setOldOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [warning, setWarning] = useState({ show: false, message: "" });
  const [error, setError] = useState({ show: false, message: "" });
  const [forYou, setForYou] = useState({ type: "popular", events: [], loading: true });

  // ✅ State cho sự kiện đã quan tâm (localStorage)
  const [recentEvents, setRecentEvents] = useState([]);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const date = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  const startStr = date.toISOString();
  const endStr = endDate.toISOString();

  useEffect(() => {
    setLoading(true);
    const fetchAll = async () => {
      try {
        const [evRes, trRes, emRes, catByRes, evWeek, order] = await Promise.all([
          fetch(`${API_BASE}/api/events`),
          fetch(`${API_BASE}/api/events/top-trending?month=${month}&year=${year}`),
          fetch(`${API_BASE}/api/events/event-month?month=${month}&year=${year}`),
          fetch(`${API_BASE}/api/events/by-category`),
          fetch(`${API_BASE}/api/events/event-weeks?start=${startStr}&end=${endStr}`),
          fetch(`${API_BASE}/api/orders/`, {
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          }),
        ]);
        const [ev, tr, em, catBy, evw, ord] = await Promise.all([
          evRes.json(), trRes.json(), emRes.json(),
          catByRes.json(), evWeek.json(), order.json(),
        ]);
        if (ev.success) setEvents(ev.data);
        if (tr.success) setTrendings(tr.data.slice(0, 10));
        if (em.success) setEventMonths(em.data.slice(0, 10));
        if (catBy.success) setCategoryData(catBy.data);
        if (evw.success) setEventWeeks(evw.data.slice(0, 10));
        if (ord.success) setOldOrders(ord.data);
      } catch (err) {
        setError({ show: true, message: "Lỗi tải dữ liệu trang chủ" });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setForYou((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(`${API_BASE}/api/recommendations/for-you?limit=10`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          setForYou({ type: data.type, events: data.data, loading: false });
        } else {
          setForYou({ type: "popular", events: [], loading: false });
        }
      } catch {
        setForYou({ type: "popular", events: [], loading: false });
      }
    };
    fetchRecommendations();
  }, []);

  useEffect(() => {
    if (token) return; // Đã đăng nhập → bỏ qua

    const ids = getRecentEventIds();
    if (ids.length === 0) return;

    const fetchRecentEvents = async () => {
      try {
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`${API_BASE}/api/events/${id}`)
              .then((r) => r.json())
              .then((d) => (d.success ? d.data : null))
              .catch(() => null)
          )
        );

        setRecentEvents(results.filter(Boolean));
      } catch {
        // Bỏ qua lỗi — mục này không quan trọng
      }
    };

    fetchRecentEvents();
  }, [token]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

  if (loading) return <HomePageSkeleton />;

  const tabEvents = activeTab === 0 ? eventWeeks : eventMonth;

  const purchasedEvents = oldOrders
    .map((order) => order.event)
    .filter(Boolean);

  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#e11d48",
  ];

  return (
    <div className="hw-page">
      <Warning show={warning.show} message={warning.message} onClose={() => setWarning({ show: false, message: "" })} />
      <ErrorNotif show={error.show} message={error.message} onClose={() => setError({ show: false, message: "" })} />

      {events.length >= 2 && (
        <div className="hw-section">
          <BannerCarousel items={events.slice(0, 8)} formatDate={formatDate} />
        </div>
      )}

      {trending.length > 0 && (
        <section className="hw-section">
          <div className="hw-sec-head">
            <h2 className="hw-sec-title"><span className="hw-fire">🔥</span> Sự kiện xu hướng</h2>
          </div>
          <HSlider className="trending-slider">
            {trending.map((ev, idx) => (
              <div
                key={ev.event_id}
                className="trend-item"
                onClick={() => navigate(`/event/${ev.event_id}`)}
              >
                <div className="trend-thumb">
                  <span
                    className="trend-num"
                    style={{
                      WebkitTextStroke: `2.5px ${colors[idx] || "#555"}`,
                      color: "transparent",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <img
                    src={ev.banner_url}
                    alt={ev.event_name}
                    className="trend-img"
                    loading="lazy"
                  />
                  <span className="trend-rank-tag">TOP {idx + 1}</span>
                </div>
                <div className="trend-body">
                  <p className="trend-title" title={ev.event_name}>
                    {ev.event_name}
                  </p>
                  <div className="trend-meta">
                    {ev.min_price ? (
                      <p className="trend-price">Từ {formatCurrency(ev.min_price)}</p>
                    ) : ev.sold_percent ? (
                      <p className="trend-sold">🔥 Đã bán {Math.round(ev.sold_percent)}%</p>
                    ) : null}
                    {ev.event_start && (
                      <p className="trend-date">
                        <span className="ev-card-cal">📅</span>
                        {formatDate(ev.event_start)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </HSlider>
        </section>
      )}

      {/* ── Khám phá theo thể loại ── */}
      {categoryData.length > 0 && (
        <section className="hw-section hw-category-section">
          <div className="hw-sec-head hw-cat-sec-head">
            <div className="hw-cat-heading-left">
              <h2 className="hw-sec-title">
                <span className="hw-cat-head-icon">📂</span> Khám phá theo thể loại
              </h2>
              <span className="hw-cat-count-pill">
                {selectedCategory === "all"
                  ? `${events.length} sự kiện`
                  : `${categoryData.find((c) => String(c.category_id) === String(selectedCategory))?.event_count || categoryData.find((c) => String(c.category_id) === String(selectedCategory))?.events?.length || 0} sự kiện`}
              </span>
            </div>

            {selectedCategory !== "all" ? (
              <button
                type="button"
                className="hw-cat-viewmore"
                onClick={() => {
                  const found = categoryData.find((c) => String(c.category_id) === String(selectedCategory));
                  if (found) {
                    navigate(`/search?genres=${encodeURIComponent(found.category_name)}`);
                  }
                }}
              >
                Xem tất cả {categoryData.find((c) => String(c.category_id) === String(selectedCategory))?.category_name} ›
              </button>
            ) : (
              <button
                type="button"
                className="hw-cat-viewmore"
                onClick={() => navigate("/search")}
              >
                Xem tất cả sự kiện ›
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="hw-cat-tabs-scroll">
            <button
              type="button"
              className={`hw-cat-tab-chip ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => setSelectedCategory("all")}
            >
              <span className="hw-cat-chip-icon">✨</span>
              <span className="hw-cat-chip-name">Tất cả</span>
              <span className="hw-cat-chip-count">{events.length}</span>
            </button>

            {categoryData.map((cat) => {
              const meta = getCategoryMeta(cat.category_name);
              const isActive = String(selectedCategory) === String(cat.category_id);
              return (
                <button
                  key={cat.category_id}
                  type="button"
                  className={`hw-cat-tab-chip ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.category_id)}
                  style={isActive ? { "--cat-accent": meta.color } : {}}
                >
                  <span className="hw-cat-chip-icon">{meta.icon}</span>
                  <span className="hw-cat-chip-name">{cat.category_name}</span>
                  <span className="hw-cat-chip-count">
                    {cat.event_count || cat.events?.length || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Events Slider */}
          {(() => {
            const currentEvents =
              selectedCategory === "all"
                ? events
                : categoryData.find((c) => String(c.category_id) === String(selectedCategory))?.events || [];

            return currentEvents.length > 0 ? (
              <HSlider itemsVisible={4} className="event-slider">
                {currentEvents.map((ev) => (
                  <EventCard
                    key={ev.event_id}
                    ev={ev}
                    onClick={() => navigate(`/event/${ev.event_id}`)}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                ))}
              </HSlider>
            ) : (
              <p className="hw-empty">Chưa có sự kiện nào trong danh mục này.</p>
            );
          })()}
        </section>
      )}

      <section className="hw-section">
        <div className="hw-sec-head">
          <h2 className="hw-sec-title">
            Dành cho bạn
            {!forYou.loading && <RecommendBadge type={forYou.type} />}
          </h2>
        </div>
        {forYou.loading ? (
          <div className="hw-skeleton-row">
            {[...Array(4)].map((_, i) => <div key={i} className="hw-skeleton-card" />)}
          </div>
        ) : forYou.events.length > 0 ? (
          <HSlider itemsVisible={4} className="event-slider">
            {forYou.events.map((ev) => (
              <EventCard key={ev.event_id} ev={ev}
                onClick={() => navigate(`/event/${ev.event_id}`)}
                formatCurrency={formatCurrency} formatDate={formatDate} />
            ))}
          </HSlider>
        ) : (
          <p className="hw-empty">Chưa có sự kiện phù hợp.</p>
        )}
      </section>

      {!token && recentEvents.length > 0 && (
        <section className="hw-section">
          <div className="hw-sec-head">
            <h2 className="hw-sec-title">Sự kiện bạn đã quan tâm</h2>
          </div>
          <HSlider itemsVisible={4} className="event-slider">
            {recentEvents.map((ev) => (
              <EventCard key={ev.event_id} ev={ev}
                onClick={() => navigate(`/event/${ev.event_id}`)}
                formatCurrency={formatCurrency} formatDate={formatDate} />
            ))}
          </HSlider>
        </section>
      )}

      {token && oldOrders.length > 0 && (
        <section className="hw-section">
          <div className="hw-sec-head">
            <h2 className="hw-sec-title">Sự kiện đã mua</h2>
          </div>
          <HSlider itemsVisible={4} className="event-slider">
            {oldOrders.map((ev) => (
              <EventCard key={ev.event_id} ev={ev}
                onClick={() => navigate(`/event/${ev.event_id}`)}
                formatCurrency={formatCurrency} formatDate={formatDate} />
            ))}
          </HSlider>
        </section>
      )}

      <section className="hw-section">
        <div className="hw-sec-head hw-tabs-head">
          <div className="hw-tabs">
            <button className={`hw-tab ${activeTab === 0 ? "active" : ""}`} onClick={() => setActiveTab(0)}>Cuối tuần này</button>
            <button className={`hw-tab ${activeTab === 1 ? "active" : ""}`} onClick={() => setActiveTab(1)}>Tháng này</button>
          </div>
        </div>
        {tabEvents.length > 0 && (
          <HSlider itemsVisible={4} className="event-slider">
            {tabEvents.map((ev) => (
              <EventCard key={ev.event_id} ev={ev}
                onClick={() => navigate(`/event/${ev.event_id}`)}
                formatCurrency={formatCurrency} formatDate={formatDate} />
            ))}
          </HSlider>
        )}
      </section>
    </div>
  );
}