import React, { useState } from "react";
import "./manage_order.css";

const API_BASE = process.env.REACT_APP_API_URL || "";

const MONTHS = [
  { value: 1,  label: "Tháng 1"  }, { value: 2,  label: "Tháng 2"  },
  { value: 3,  label: "Tháng 3"  }, { value: 4,  label: "Tháng 4"  },
  { value: 5,  label: "Tháng 5"  }, { value: 6,  label: "Tháng 6"  },
  { value: 7,  label: "Tháng 7"  }, { value: 8,  label: "Tháng 8"  },
  { value: 9,  label: "Tháng 9"  }, { value: 10, label: "Tháng 10" },
  { value: 11, label: "Tháng 11" }, { value: 12, label: "Tháng 12" },
];

const YEARS = Array.from(
  { length: 2031 - 2020 },
  (_, i) => 2020 + i
);

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("vi-VN") +
    " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
}

function badgeClass(status) {
  if (status === true) return "mo-badge-live";
  if (status === false) return "mo-badge-ended";
  return "mo-badge-ended";
}

function badgeLabel(status) {
  if (status === true) return "● Đang diễn ra";
  if (status === false) return "Đã kết thúc";
  return "Đã kết thúc";
}

// ── Skeleton ──────────────────────────────────
function SkeletonList() {
  return (
    <div className="mo-loading-row">
      <div className="mo-skeleton" />
      <div className="mo-skeleton" />
      <div className="mo-skeleton" style={{ opacity: 0.5 }} />
    </div>
  );
}

// ── Event card ────────────────────────────────
function EventCard({ event, isActive, onClick }) {
  return (
    <div
      className={`mo-event-card ${isActive ? "active" : ""}`}
      onClick={() => onClick(event.event_id)}
    >
      <div className="mo-event-dot">
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8"  y1="2" x2="8"  y2="6" />
          <line x1="3"  y1="10" x2="21" y2="10" />
        </svg>
      </div>

      <div className="mo-event-info">
        <h4>{event.event_name}</h4>
        <div className="mo-event-meta">
          <span>Bắt đầu: {fmtDate(event.event_start)}</span>
          <span className="mo-dot-sep" />
          <span>Kết thúc: {fmtDate(event.event_end)}</span>
        </div>
      </div>

      <span className={`mo-event-badge ${badgeClass(event.status)}`}>
        {badgeLabel(event.event_status)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────
export default function ManageOrder() {
  const [month,    setMonth]    = useState("");
  const [year,     setYear]     = useState(String(new Date().getFullYear()));
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [searchQ,  setSearchQ]  = useState("");

  // ── Fetch events ────────────────────────────
  const handleSearch = async () => {
    if (!month || !year) {
      alert("Vui lòng chọn tháng và năm");
      return;
    }
    setLoading(true);
    setEvents([]);
    setActiveId(null);
    try {
      const res  = await fetch(
        `${API_BASE}/api/admin/events/calendar?month=${month}&year=${year}`
      );
      const data = await res.json();
      setEvents(data.data ?? []);
    } catch (err) {
      console.error("Lỗi tải sự kiện:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Select event → fetch orders ─────────────
  const handleSelectEvent = async (eventId) => {
    setActiveId(eventId);
    try {
      const res  = await fetch(`${API_BASE}/orders/event/${eventId}`);
      const data = await res.json();
      console.log("Orders:", data);
      // TODO: setOrders(data) nếu bạn muốn hiển thị danh sách đơn hàng
    } catch (err) {
      console.error("Lỗi tải đơn hàng:", err);
    }
  };

  // ── Filter by search ─────────────────────────
  const filtered = searchQ
    ? events.filter(e =>
        e.event_name.toLowerCase().includes(searchQ.toLowerCase())
      )
    : events;

  // ── Render ────────────────────────────────────
  return (
    <div className="manage-order-wrap">
      {/* Header */}
      <div className="mo-header">
        <h1>Quản lý đơn hàng</h1>
        <span>theo tháng / sự kiện</span>
      </div>

      {/* Filter card */}
      <div className="mo-filter-card">
        <div className="mo-filter-row">

          <div className="mo-field">
            <label>Tháng</label>
            <div className="mo-select-wrap">
              <select value={month} onChange={e => setMonth(e.target.value)}>
                <option value="">Chọn tháng</option>
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mo-field">
            <label>Năm</label>
            <div className="mo-select-wrap">
              <select value={year} onChange={e => setYear(e.target.value)}>
                <option value="">Chọn năm</option>
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div /> {/* spacer */}

          <button
            className="mo-btn-primary"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              "Đang tải..."
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor"
                  strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Xem sự kiện
              </>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="mo-search-row">
          <div className="mo-search-wrap">
            <svg className="mo-search-icon" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm tên sự kiện..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
          {searchQ && (
            <button className="mo-btn-ghost" onClick={() => setSearchQ("")}>
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Section label */}
      {!loading && filtered.length > 0 && (
        <div className="mo-section-label">{filtered.length} sự kiện</div>
      )}

      {/* Event list */}
      <div className="mo-event-list">
        {loading && <SkeletonList />}

        {!loading && events.length === 0 && (
          <div className="mo-empty-state">
            <span className="mo-empty-icon">◎</span>
            Không có sự kiện nào trong tháng này
          </div>
        )}

        {!loading && events.length > 0 && filtered.length === 0 && (
          <div className="mo-empty-state">
            <span className="mo-empty-icon">◎</span>
            Không tìm thấy sự kiện nào
          </div>
        )}

        {!loading && filtered.map(event => (
          <EventCard
            key={event.event_id}
            event={event}
            isActive={activeId === event.event_id}
            onClick={handleSelectEvent}
          />
        ))}
      </div>
    </div>
  );
}