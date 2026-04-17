import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingUser from "../../components/loading/loading";
import Warning from "../../components/notification/warning/warning.jsx";
import ErrorNotif from "../../components/notification/error/error.jsx";
import "./home.css";

const API_BASE = process.env.REACT_APP_API_URL;

// ─── Lấy header Authorization nếu user đã đăng nhập ──────────────────────────
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── HSlider ──────────────────────────────────────────────────────────────────
function HSlider({ children, itemsVisible, className = "" }) {
  const [page, setPage] = useState(0);
  const total = children.length || 0;
  const maxPage = Math.max(0, Math.ceil(total / itemsVisible) - 1);

  const prev = () => setPage((p) => Math.max(0, p - 1));
  const next = () => setPage((p) => Math.min(maxPage, p + 1));

  return (
    <div className={`hslider ${className}`}>
      <button
        className={`hslider-arrow hslider-prev ${page === 0 ? "disabled" : ""}`}
        onClick={prev}
        aria-label="Trước"
      >
        ‹
      </button>
      <div className="hslider-viewport">
        <div
          className="hslider-track"
          style={{ transform: `translateX(calc(-${page * 100}%))` }}
        >
          {children}
        </div>
      </div>
      <button
        className={`hslider-arrow hslider-next ${page === maxPage ? "disabled" : ""}`}
        onClick={next}
        aria-label="Tiếp"
      >
        ›
      </button>
    </div>
  );
}

// ─── Banner Carousel ──────────────────────────────────────────────────────────
function BannerCarousel({ items }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const total = items.length;
  const timerRef = useRef(null);

  const goTo = (i) => setActive((i + total) % total);

  useEffect(() => {
    timerRef.current = setInterval(() => setActive((a) => (a + 1) % total), 4000);
    return () => clearInterval(timerRef.current);
  }, [total]);

  if (!total) return null;

  const left = items[active];
  const right = items[(active + 1) % total];

  return (
    <div className="banner-carousel">
      <button className="banner-arrow left" onClick={() => goTo(active - 1)}>‹</button>
      <div className="banner-slides">
        <div className="banner-slide" onClick={() => {}}>
          <img src={left.banner_url} alt={left.event_name} />
          <div className="banner-overlay">
            <button className="banner-cta" onClick={() => navigate(`/event/${left.event_id}`)}>
              Xem chi tiết
            </button>
          </div>
        </div>
        <div className="banner-slide" onClick={() => {}}>
          <img src={right.banner_url} alt={right.event_name} />
          <div className="banner-overlay">
            <button className="banner-cta" onClick={() => navigate(`/event/${right.event_id}`)}>
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
      <button className="banner-arrow right" onClick={() => goTo(active + 1)}>›</button>
      <div className="banner-dots">
        {items.map((_, i) => (
          <span
            key={i}
            className={`banner-dot ${i === active ? "active" : ""}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Badge loại gợi ý ─────────────────────────────────────────────────────────
function RecommendBadge({ type }) {
  if (type === "personalized") {
    return (
      <span className="hw-rec-badge hw-rec-badge--personal">✦ Dành riêng cho bạn</span>
    );
  }
}

// ─── HomeUser ────────────────────────────────────────────────────────────────
export default function HomeUser() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [trending, setTrendings] = useState([]);
  const [eventMonth, setEventMonths] = useState([]);
  const [categories, setCategories] = useState([]);
  const [eventCategory, setEventCategory] = useState([]);
  const [eventWeeks, setEventWeeks] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [warning, setWarning] = useState({ show: false, message: "" });
  const [error, setError] = useState({ show: false, message: "" });

  // ── Trạng thái "Dành cho bạn" ──────────────────────────────────────────────
  const [forYou, setForYou] = useState({ type: "popular", events: [], loading: true });

  const navigate = useNavigate();

  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  today.setDate(today.getDate() + 7);
  const date = new Date();
  const startStr = date.toISOString();
  const endStr = today.toISOString();

  // ── Fetch dữ liệu chính ────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const fetchAll = async () => {
      try {
        const [evRes, trRes, emRes, catRes, evWeek] = await Promise.all([
          fetch(`${API_BASE}/api/events`),
          fetch(`${API_BASE}/api/events/top-trending?month=${month}&year=${year}`),
          fetch(`${API_BASE}/api/events/event-month?month=${month}&year=${year}`),
          fetch(`${API_BASE}/api/categories/`),
          fetch(`${API_BASE}/api/events/event-weeks?start=${startStr}&end=${endStr}`),
        ]);
        const [ev, tr, em, cat, evw] = await Promise.all([
          evRes.json(), trRes.json(), emRes.json(), catRes.json(), evWeek.json(),
        ]);
        if (ev.success) setEvents(ev.data);
        if (tr.success) setTrendings(tr.data.slice(0, 10));
        if (em.success) setEventMonths(em.data.slice(0, 10));
        if (cat.success) setCategories(cat.data);
        if (evw.success) setEventWeeks(evw.data.slice(0, 10));
      } catch (err) {
        setError({ show: true, message: "Lỗi tải dữ liệu trang chủ" });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Fetch "Dành cho bạn" — chạy độc lập để không block màn hình chính ─────
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

  // ── Category events ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!categories.length) return;
    const id = categories[0]?.category_id;
    if (!id) return;
    fetch(`${API_BASE}/api/events/category/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setEventCategory(d.data.slice(0, 10)); })
      .catch(() => {});
  }, [categories]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

  if (loading) return <LoadingUser />;

  const tabEvents = activeTab === 0 ? eventWeeks : eventMonth;

  return (
    <div className="hw-page">
      <Warning
        show={warning.show}
        message={warning.message}
        onClose={() => setWarning({ show: false, message: "" })}
      />
      <ErrorNotif
        show={error.show}
        message={error.message}
        onClose={() => setError({ show: false, message: "" })}
      />

      {/* ── Banner carousel ── */}
      {events.length >= 2 && (
        <div className="hw-section">
          <BannerCarousel items={events.slice(0, 8)} />
        </div>
      )}

      {/* ── Trending ── */}
      {trending.length > 0 && (
        <section className="hw-section">
          <div className="hw-sec-head">
            <h2 className="hw-sec-title">
              <span className="hw-fire">🔥</span> Sự kiện xu hướng
            </h2>
          </div>
          <HSlider itemsVisible={4} className="trending-slider">
            {trending.map((ev, idx) => (
              <div
                key={ev.event_id}
                className="trend-item"
                onClick={() => navigate(`/event/${ev.event_id}`)}
              >
                <span
                  className="trend-num"
                  style={{
                    WebkitTextStroke: `2px ${
                      idx === 0 ? "#22c55e" : idx === 1 ? "#3b82f6" : "#555"
                    }`,
                    color: "transparent",
                  }}
                >
                  {idx + 1}
                </span>
                <img src={ev.banner_url} alt={ev.event_name} className="trend-img" />
              </div>
            ))}
          </HSlider>
        </section>
      )}

      {/* ── Dành cho bạn (Hybrid Recommender) ── */}
      <section className="hw-section">
        <div className="hw-sec-head">
          <h2 className="hw-sec-title">
            Dành cho bạn
            {!forYou.loading && <RecommendBadge type={forYou.type} />}
          </h2>
          <Link to="/search" className="hw-viewmore">Xem thêm ›</Link>
        </div>

        {forYou.loading ? (
          // Skeleton placeholder khi đang load gợi ý
          <div className="hw-skeleton-row">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="hw-skeleton-card" />
            ))}
          </div>
        ) : forYou.events.length > 0 ? (
          <HSlider itemsVisible={4} className="event-slider">
            {forYou.events.map((ev) => (
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
          <p className="hw-empty">Chưa có sự kiện phù hợp.</p>
        )}
      </section>

      {/* ── Tabs: Cuối tuần / Tháng này ── */}
      <section className="hw-section">
        <div className="hw-sec-head hw-tabs-head">
          <div className="hw-tabs">
            <button
              className={`hw-tab ${activeTab === 0 ? "active" : ""}`}
              onClick={() => setActiveTab(0)}
            >
              Cuối tuần này
            </button>
            <button
              className={`hw-tab ${activeTab === 1 ? "active" : ""}`}
              onClick={() => setActiveTab(1)}
            >
              Tháng này
            </button>
          </div>
          <Link to="/search" className="hw-viewmore">Xem thêm ›</Link>
        </div>
        {tabEvents.length > 0 && (
          <HSlider itemsVisible={4} className="event-slider">
            {tabEvents.map((ev) => (
              <EventCard
                key={ev.event_id}
                ev={ev}
                onClick={() => navigate(`/event/${ev.event_id}`)}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            ))}
          </HSlider>
        )}
      </section>
    </div>
  );
}

// ─── Shared EventCard ─────────────────────────────────────────────────────────
function EventCard({ ev, onClick, formatCurrency, formatDate }) {
  return (
    <div className="ev-card" onClick={onClick}>
      <div className="ev-card-thumb">
        <img src={ev.banner_url} alt={ev.event_name} loading="lazy" />
      </div>
      <div className="ev-card-body">
        <p className="ev-card-title">{ev.event_name}</p>
        <p className="ev-card-price">Từ {formatCurrency(ev.min_price || 0)}</p>
        <p className="ev-card-date">
          <span className="ev-card-cal">📅</span>
          {formatDate(ev.event_end)}
        </p>
      </div>
    </div>
  );
}