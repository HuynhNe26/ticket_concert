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
      {/* Banner */}
      <div className="hw-section">
        <div className="hw-sk hw-sk-banner" />
      </div>

      {/* Trending — chỉ cần rect đơn giản */}
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

      {/* 2 sections event card */}
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
function HSlider({ children, itemsVisible, className = "" }) {
  const [page, setPage] = useState(0);
  const total = children.length || 0;
  const maxPage = Math.max(0, Math.ceil(total / itemsVisible) - 1);
  const prev = () => setPage((p) => Math.max(0, p - 1));
  const next = () => setPage((p) => Math.min(maxPage, p + 1));

  return (
    <div className={`hslider ${className}`}>
      <button className={`hslider-arrow hslider-prev ${page === 0 ? "disabled" : ""}`} onClick={prev} aria-label="Trước">‹</button>
      <div className="hslider-viewport">
        <div className="hslider-track" style={{ transform: `translateX(calc(-${page * 100}%))` }}>
          {children}
        </div>
      </div>
      <button className={`hslider-arrow hslider-next ${page === maxPage ? "disabled" : ""}`} onClick={next} aria-label="Tiếp">›</button>
    </div>
  );
}

// ─── BannerCarousel ───────────────────────────────────────────────────────────
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
        {[left, right].map((item) => (
          <div key={item.event_id} className="banner-slide">
            <img src={item.banner_url} alt={item.event_name} />
            <div className="banner-overlay">
              <button className="banner-cta" onClick={() => navigate(`/event/${item.event_id}`)}>
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="banner-arrow right" onClick={() => goTo(active + 1)}>›</button>
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
    return <span className="hw-rec-badge hw-rec-badge--personal">✦ Dành riêng cho bạn</span>;
  }
  return null;
}

// ─── EventCard ────────────────────────────────────────────────────────────────
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

// ─── HomeUser ─────────────────────────────────────────────────────────────────
export default function HomeUser() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [trending, setTrendings] = useState([]);
  const [eventMonth, setEventMonths] = useState([]);
  const [categories, setCategories] = useState([]);
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
        const [evRes, trRes, emRes, catRes, evWeek, order] = await Promise.all([
          fetch(`${API_BASE}/api/events`),
          fetch(`${API_BASE}/api/events/top-trending?month=${month}&year=${year}`),
          fetch(`${API_BASE}/api/events/event-month?month=${month}&year=${year}`),
          fetch(`${API_BASE}/api/categories/`),
          fetch(`${API_BASE}/api/events/event-weeks?start=${startStr}&end=${endStr}`),
          fetch(`${API_BASE}/api/orders/`, {
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          }),
        ]);
        const [ev, tr, em, cat, evw, ord] = await Promise.all([
          evRes.json(), trRes.json(), emRes.json(),
          catRes.json(), evWeek.json(), order.json(),
        ]);
        if (ev.success) setEvents(ev.data);
        if (tr.success) setTrendings(tr.data.slice(0, 10));
        if (em.success) setEventMonths(em.data.slice(0, 10));
        if (cat.success) setCategories(cat.data);
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

  return (
    <div className="hw-page">
      <Warning show={warning.show} message={warning.message} onClose={() => setWarning({ show: false, message: "" })} />
      <ErrorNotif show={error.show} message={error.message} onClose={() => setError({ show: false, message: "" })} />

      {events.length >= 2 && (
        <div className="hw-section">
          <BannerCarousel items={events.slice(0, 8)} />
        </div>
      )}

      {trending.length > 0 && (
        <section className="hw-section">
          <div className="hw-sec-head">
            <h2 className="hw-sec-title"><span className="hw-fire">🔥</span> Sự kiện xu hướng</h2>
          </div>
          <HSlider itemsVisible={4} className="trending-slider">
            {trending.map((ev, idx) => (
              <div key={ev.event_id} className="trend-item" onClick={() => navigate(`/event/${ev.event_id}`)}>
                <span className="trend-num" style={{
                  WebkitTextStroke: `2px ${idx === 0 ? "#22c55e" : idx === 1 ? "#3b82f6" : "#555"}`,
                  color: "transparent",
                }}>{idx + 1}</span>
                <img src={ev.banner_url} alt={ev.event_name} className="trend-img" />
              </div>
            ))}
          </HSlider>
        </section>
      )}

      {/* Dành cho bạn */}
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

      {/* ✅ Sự kiện bạn đã quan tâm — chỉ hiển thị khi CHƯA đăng nhập & có dữ liệu */}
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

      {/* Sự kiện đã mua */}
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

      {/* Tabs */}
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