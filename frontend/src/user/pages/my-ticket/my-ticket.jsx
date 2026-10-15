import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";
import "./my-ticket.css";
import LoginPage from "../login/Loginpage";
import { Link, Navigate, useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const mapStatus = (s) => {
  if (s === "Thành công" || s === "success") return "success";
  return "unknown";
};

const statusMeta = {
  success: {
    label: "Đã thanh toán",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.14)",
    border: "rgba(34, 197, 94, 0.28)",
  },
  unknown: {
    label: "Không rõ",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.25)",
  },
};

const usageLabel = (ticket) => {
  if (ticket.ticket_status === false)
    return {
      text: "Chưa sử dụng",
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.14)",
      border: "rgba(56, 189, 248, 0.3)",
    };
  return {
    text: "Đã sử dụng",
    color: "#f87171",
    bg: "rgba(248, 113, 113, 0.14)",
    border: "rgba(248, 113, 113, 0.3)",
  };
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatVND(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("vi-VN") + " ₫";
}

// ─── Group tickets by event date ───────────────────────────────────────────────
function groupByEventDate(tickets) {
  const sorted = [...tickets].sort((a, b) => {
    const da = new Date(a.event_start || a.event_end || a.payment_created_at);
    const db = new Date(b.event_start || b.event_end || b.payment_created_at);
    return da - db;
  });

  const groups = [];
  let lastDateKey = null;

  sorted.forEach((t) => {
    const d = new Date(t.event_start || t.event_end || t.payment_created_at);
    const dateKey = !isNaN(d.getTime())
      ? d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "Không rõ ngày";

    if (dateKey !== lastDateKey) {
      groups.push({
        type: "separator",
        date: dateKey,
        raw: t.event_start || t.event_end || t.payment_created_at,
      });
      lastDateKey = dateKey;
    }
    groups.push({ type: "ticket", data: t });
  });

  return groups;
}

// ─── Date Separator ─────────────────────────────────────────────────────────────
function DateSeparator({ date, raw }) {
  const now = new Date();
  const rawDate = raw ? new Date(raw) : null;
  const isToday = rawDate && rawDate.toDateString() === now.toDateString();

  return (
    <div className="date-separator">
      <div className="date-separator-line" />
      <div className="date-separator-pill">
        <span className="date-sep-icon">📅</span>
        {isToday && <span className="date-sep-highlight">Hôm nay&nbsp;·&nbsp;</span>}
        <span>{date}</span>
      </div>
      <div className="date-separator-line" />
    </div>
  );
}

// ─── QR Canvas ──────────────────────────────────────────────────────────────────
function QRCanvas({ value, size = 150 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: "#090d16", light: "#ffffff" },
    }).catch(() => {});
  }, [value, size]);
  return <canvas ref={canvasRef} style={{ borderRadius: 12, display: "block" }} />;
}

// ─── Ticket Modal ───────────────────────────────────────────────────────────────
function TicketModal({ ticket, onClose }) {
  const status = mapStatus(ticket.payment_status);
  const meta = statusMeta[status];
  const usage = usageLabel(ticket);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ticket-modal-main" onClick={(e) => e.stopPropagation()}>
        {/* CLOSE */}
        <button className="modal-close" onClick={onClose} aria-label="Đóng">
          ✕
        </button>

        {/* ── BANNER ── */}
        <div className="ticket-modal-banner">
          {ticket.banner_url ? (
            <img
              className="ticket-modal-banner-img"
              src={ticket.banner_url}
              alt={ticket.event_name}
            />
          ) : (
            <div className="ticket-modal-banner-fallback">🎵</div>
          )}
          <div className="ticket-modal-banner-overlay" />
          <div className="ticket-modal-event-title">{ticket.event_name}</div>
        </div>

        {/* ── BODY ── */}
        <div className="ticket-modal-body">
          {/* LEFT */}
          <div className="ticket-modal-left">
            {/* Order code & zone */}
            <div className="ticket-header-chips">
              <div className="ticket-order-code">
                <span className="ticket-order-code-label">Mã đơn hàng</span>
                <span className="ticket-order-code-value">
                  #{ticket.payment_ref || ticket.payment_id}
                </span>
              </div>
              {(ticket.zone_name || ticket.zone_code) && (
                <div className="ticket-zone-chip">
                  💺 {ticket.zone_name || ticket.zone_code}
                </div>
              )}
            </div>

            {/* Meta grid */}
            <div className="ticket-meta-grid">
              <div className="ticket-meta-item full">
                <div className="ticket-meta-label">Thời gian diễn ra</div>
                <div className="ticket-meta-value highlight-date">
                  📅 {fmt(ticket.event_end || ticket.event_start)}
                </div>
              </div>

              <div className="ticket-meta-item full">
                <div className="ticket-meta-label">Địa điểm tổ chức</div>
                <div className="ticket-meta-value">
                  📍 {ticket.event_location || "—"}
                </div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Khu vực / Hạng vé</div>
                <div className="ticket-meta-value highlight-zone">
                  {ticket.zone_name || ticket.zone_code || "—"}
                </div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Số lượng vé</div>
                <div className="ticket-meta-value highlight-qty">
                  {ticket.ticket_quantity} vé
                </div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Đơn giá</div>
                <div className="ticket-meta-value">{formatVND(ticket.price)}</div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Phương thức</div>
                <div className="ticket-meta-value">{ticket.method || "—"}</div>
              </div>

              <div className="ticket-meta-item full">
                <div className="ticket-meta-label">Thời gian thanh toán</div>
                <div className="ticket-meta-value sub-date">
                  {fmt(ticket.payment_created_at)}
                </div>
              </div>
            </div>

            {/* Total price */}
            <div className="ticket-price-row">
              <span className="ticket-price-label">Tổng thanh toán</span>
              <span className="ticket-price-amount">
                {formatVND(ticket.total_price)}
              </span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="ticket-modal-right">
            {/* QR */}
            <div className="ticket-qr-wrap">
              <div className="ticket-qr-box">
                {ticket.ticket_qr ? (
                  <QRCanvas value={ticket.ticket_qr} size={150} />
                ) : (
                  <div className="qr-placeholder">Không có mã QR</div>
                )}
              </div>
              <span className="ticket-qr-hint">
                Xuất trình mã QR tại cửa soát vé
              </span>
            </div>

            {/* Status */}
            <div className="ticket-status-block">
              <span className="ticket-status-title">Trạng thái vé</span>
              <div className="ticket-status-badges">
                <span
                  className="ticket-status-badge"
                  style={{
                    color: meta.color,
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                  }}
                >
                  ✓ {meta.label}
                </span>
                <span
                  className="ticket-status-badge"
                  style={{
                    color: usage.color,
                    background: usage.bg,
                    border: `1px solid ${usage.border}`,
                  }}
                >
                  ● {usage.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card (List Item) ────────────────────────────────────────────────────
function TicketCardItem({ ticket, onClick }) {
  const status = mapStatus(ticket.payment_status);
  const meta = statusMeta[status];
  const usage = usageLabel(ticket);

  const eventDateStr = fmt(ticket.event_end || ticket.event_start);
  const locationShort =
    ticket.event_location?.split(",").slice(-2).join(",").trim() ||
    ticket.event_location ||
    "—";

  return (
    <div
      className="tc-card"
      onClick={() => onClick(ticket)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(ticket);
        }
      }}
    >
      {/* ── Desktop Left Stub (hidden on mobile) ── */}
      <div className="tc-left">
        <div className="tc-left-glow" />
        <div className="tc-left-icon">🎫</div>
        <div className="tc-qty">×{ticket.ticket_quantity}</div>
        <span className="tc-qty-label">vé</span>
      </div>

      {/* ── Desktop Ticket Cutout Notches (hidden on mobile) ── */}
      <div className="tc-notch tc-notch-top" />
      <div className="tc-notch tc-notch-bottom" />

      {/* ── Main Content ── */}
      <div className="tc-middle">
        {/* Mobile top meta bar */}
        <div className="tc-mobile-meta-bar">
          <div className="tc-chips-wrap">
            {(ticket.zone_name || ticket.zone_code) && (
              <span className="tc-zone-pill">
                💺 {ticket.zone_name || ticket.zone_code}
              </span>
            )}
            <span className="tc-mobile-qty-pill">
              🎟️ ×{ticket.ticket_quantity} vé
            </span>
          </div>
          <span className="tc-mobile-order-code">
            #{ticket.payment_ref || ticket.payment_id}
          </span>
        </div>

        {/* Event Title */}
        <div className="tc-header-row">
          <h3 className="tc-event" title={ticket.event_name}>
            {ticket.event_name}
          </h3>
          {(ticket.zone_name || ticket.zone_code) && (
            <span className="tc-zone-pill tc-desktop-only">
              💺 {ticket.zone_name || ticket.zone_code}
            </span>
          )}
        </div>

        {/* Date & Location */}
        <div className="tc-info-grid">
          <div className="tc-info-item tc-date">
            <span className="tc-info-icon">📅</span>
            <span>{eventDateStr}</span>
          </div>
          <div className="tc-info-item tc-loc" title={ticket.event_location}>
            <span className="tc-info-icon">📍</span>
            <span>{locationShort}</span>
          </div>
        </div>

        {/* Desktop order subtitle */}
        <div className="tc-order-sub tc-desktop-only">
          Mã đơn: #{ticket.payment_ref || ticket.payment_id} · Mua lúc:{" "}
          {fmtDate(ticket.payment_created_at)}
        </div>
      </div>

      {/* ── Mobile Perforated Divider with Side Notches ── */}
      <div className="tc-mobile-divider">
        <div className="tc-mobile-notch tc-notch-l" />
        <div className="tc-mobile-dash" />
        <div className="tc-mobile-notch tc-notch-r" />
      </div>

      {/* ── Right / Bottom Pricing & Actions ── */}
      <div className="tc-right">
        <div className="tc-price-badges-group">
          <div className="tc-price-wrap">
            <span className="tc-price-label-mobile">Tổng tiền:</span>
            <div className="tc-price">
              {Number(ticket.total_price).toLocaleString("vi-VN")}
              <span>₫</span>
            </div>
          </div>

          <div className="tc-badges-wrap">
            <span
              className="tc-badge"
              style={{
                color: meta.color,
                background: meta.bg,
                border: `1px solid ${meta.border}`,
              }}
            >
              ✓ {meta.label}
            </span>
            <span
              className="tc-badge"
              style={{
                color: usage.color,
                background: usage.bg,
                border: `1px solid ${usage.border}`,
              }}
            >
              ● {usage.text}
            </span>
          </div>
        </div>

        <button className="tc-qr-action" type="button" aria-label="Xem vé và mã QR">
          <span>Xem vé & QR</span>
          <span className="tc-action-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const TIME_FILTERS = [
  { label: "Tất cả vé", value: "all" },
  { label: "Sắp diễn ra", value: "upcoming" },
  { label: "Đã kết thúc", value: "ended" },
];

const MONTHS_LIST = [
  { value: "all", label: "Tất cả các tháng" },
  { value: "1", label: "Tháng 1" },
  { value: "2", label: "Tháng 2" },
  { value: "3", label: "Tháng 3" },
  { value: "4", label: "Tháng 4" },
  { value: "5", label: "Tháng 5" },
  { value: "6", label: "Tháng 6" },
  { value: "7", label: "Tháng 7" },
  { value: "8", label: "Tháng 8" },
  { value: "9", label: "Tháng 9" },
  { value: "10", label: "Tháng 10" },
  { value: "11", label: "Tháng 11" },
  { value: "12", label: "Tháng 12" },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function MyTicket() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTime, setActiveTime] = useState("all"); // 'all' | 'upcoming' | 'ended'
  const [selected, setSelected] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  // Mặc định ban đầu: Tháng & Năm hiện tại
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1; // 1-12
  const currentYearNum = now.getFullYear();   // e.g. 2026

  const [selectedMonth, setSelectedMonth] = useState(String(currentMonthNum));
  const [selectedYear, setSelectedYear] = useState(String(currentYearNum));

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/my-ticket`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/", { replace: true });
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.success) setTickets(d.data || []);
        else setError(d.message || "Không thể tải danh sách vé");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  // Danh sách các năm khả dụng (lấy từ dữ liệu vé của user + năm hiện tại)
  const availableYears = useMemo(() => {
    const years = new Set([currentYearNum]);
    tickets.forEach((t) => {
      const d = new Date(t.event_start || t.event_end || t.payment_created_at);
      if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [tickets, currentYearNum]);

  // Thống kê vé theo tháng để phát hiện các tháng có vé khác
  const monthTicketStats = useMemo(() => {
    const stats = {};
    tickets.forEach((t) => {
      const d = new Date(t.event_start || t.event_end || t.payment_created_at);
      if (!isNaN(d.getTime())) {
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
        stats[key] = (stats[key] || 0) + 1;
      }
    });
    return stats;
  }, [tickets]);

  // Bộ lọc chính
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const nowTime = new Date();
      const eventDate = new Date(
        t.event_end || t.event_start || t.payment_created_at
      );

      // 1. Lọc theo trạng thái thời gian (Sắp diễn ra / Đã kết thúc)
      if (activeTime === "upcoming" && eventDate < nowTime) return false;
      if (activeTime === "ended" && eventDate >= nowTime) return false;

      // 2. Lọc theo Tháng & Năm
      if (!isNaN(eventDate.getTime())) {
        if (
          selectedYear !== "all" &&
          eventDate.getFullYear() !== Number(selectedYear)
        ) {
          return false;
        }
        if (
          selectedMonth !== "all" &&
          eventDate.getMonth() + 1 !== Number(selectedMonth)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, activeTime, selectedMonth, selectedYear]);

  // Điều hướng tháng trước / tháng sau
  const handlePrevMonth = () => {
    if (selectedMonth === "all") {
      setSelectedMonth(String(currentMonthNum));
      return;
    }
    const m = Number(selectedMonth);
    const y = selectedYear === "all" ? currentYearNum : Number(selectedYear);
    if (m === 1) {
      setSelectedMonth("12");
      setSelectedYear(String(y - 1));
    } else {
      setSelectedMonth(String(m - 1));
      if (selectedYear === "all") setSelectedYear(String(y));
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === "all") {
      setSelectedMonth(String(currentMonthNum));
      return;
    }
    const m = Number(selectedMonth);
    const y = selectedYear === "all" ? currentYearNum : Number(selectedYear);
    if (m === 12) {
      setSelectedMonth("1");
      setSelectedYear(String(y + 1));
    } else {
      setSelectedMonth(String(m + 1));
      if (selectedYear === "all") setSelectedYear(String(y));
    }
  };

  const isCurrentMonthActive =
    selectedMonth === String(currentMonthNum) &&
    selectedYear === String(currentYearNum);

  const resetToCurrentMonth = () => {
    setSelectedMonth(String(currentMonthNum));
    setSelectedYear(String(currentYearNum));
    setActiveTime("all");
  };

  const showAllMonths = () => {
    setSelectedMonth("all");
    setSelectedYear("all");
  };

  // Gom nhóm vé theo ngày diễn ra sự kiện
  const grouped = useMemo(() => groupByEventDate(filtered), [filtered]);

  // Tìm tháng khác có vé gần nhất nếu tháng hiện tại trống
  const alternativeMonth = useMemo(() => {
    if (filtered.length > 0 || tickets.length === 0) return null;
    const entries = Object.entries(monthTicketStats);
    if (!entries.length) return null;
    // Lấy tháng đầu tiên có vé
    const [monthYear, count] = entries[0];
    const [m, y] = monthYear.split("/");
    return { month: m, year: y, count };
  }, [filtered, tickets, monthTicketStats]);

  // Thống kê nhanh
  const upcomingCount = useMemo(() => {
    const cur = new Date();
    return tickets.filter((t) => new Date(t.event_end || t.event_start) >= cur)
      .length;
  }, [tickets]);

  const endedCount = useMemo(() => {
    const cur = new Date();
    return tickets.filter((t) => new Date(t.event_end || t.event_start) < cur)
      .length;
  }, [tickets]);

  // Nếu chưa đăng nhập: chuyển hướng về trang home ngay lập tức, không hiển thị giao diện
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mtp-root">
      <div className="mtp-container">
        {/* ── HEADER ── */}
        <div className="mtp-header">
          <div className="mtp-header-left">
            <h1 className="mtp-title">VÉ CỦA TÔI</h1>
            <p className="mtp-sub">
              Quản lý vé đã đặt, theo dõi lịch diễn và quét mã QR tại cổng sự kiện
            </p>
          </div>

          <div className="mtp-quick-stats">
            <div className="stat-pill">
              <span className="stat-label">Tổng vé</span>
              <span className="stat-val">{tickets.length}</span>
            </div>
            <div className="stat-pill highlight-blue">
              <span className="stat-label">Sắp diễn ra</span>
              <span className="stat-val">{upcomingCount}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Đã qua</span>
              <span className="stat-val">{endedCount}</span>
            </div>
          </div>
        </div>

        {/* ── BỘ LỌC THÁNG / NĂM & TRẠNG THÁI ── */}
        <div className="mtp-controls-panel">
          {/* Row 1: Time status tabs */}
          <div className="mtp-row-tabs">
            <div className="filter-group">
              {TIME_FILTERS.map((t) => {
                const count =
                  t.value === "all"
                    ? tickets.length
                    : t.value === "upcoming"
                    ? upcomingCount
                    : endedCount;
                return (
                  <button
                    key={t.value}
                    className={`filter-btn${
                      activeTime === t.value ? " active" : ""
                    }`}
                    onClick={() => setActiveTime(t.value)}
                  >
                    {t.label}
                    <span className="tab-count">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Quick shortcuts */}
            <div className="quick-actions">
              <button
                className={`quick-btn${isCurrentMonthActive ? " active" : ""}`}
                onClick={resetToCurrentMonth}
                title="Xem vé trong tháng & năm hiện tại"
              >
                📅 Tháng này ({currentMonthNum}/{currentYearNum})
              </button>
              <button
                className={`quick-btn${
                  selectedMonth === "all" && selectedYear === "all"
                    ? " active"
                    : ""
                }`}
                onClick={showAllMonths}
                title="Xem tất cả các tháng"
              >
                🌐 Tất cả thời gian
              </button>
            </div>
          </div>

          {/* Row 2: Month & Year Navigator */}
          <div className="mtp-row-date-filter">
            <div className="month-stepper">
              <button
                className="step-btn"
                onClick={handlePrevMonth}
                title="Tháng trước"
                disabled={selectedMonth === "all"}
              >
                ◀
              </button>

              <div className="stepper-center">
                <span className="stepper-icon">🗓️</span>
                <span className="stepper-label">
                  {selectedMonth === "all"
                    ? "Tất cả các tháng"
                    : `Tháng ${selectedMonth}`}
                  {selectedYear !== "all" ? `, ${selectedYear}` : ""}
                </span>
              </div>

              <button
                className="step-btn"
                onClick={handleNextMonth}
                title="Tháng sau"
                disabled={selectedMonth === "all"}
              >
                ▶
              </button>
            </div>

            {/* Dropdown Selectors */}
            <div className="selectors-wrap">
              <div className="select-field">
                <label htmlFor="month-select" className="select-label">
                  Tháng:
                </label>
                <select
                  id="month-select"
                  className="custom-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="select-field">
                <label htmlFor="year-select" className="select-label">
                  Năm:
                </label>
                <select
                  id="year-select"
                  className="custom-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="all">Tất cả năm</option>
                  {availableYears.map((y) => (
                    <option key={y} value={String(y)}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Summary Badge */}
            <div className="filter-summary-badge">
              Tìm thấy <strong>{filtered.length}</strong> vé phù hợp
            </div>
          </div>
        </div>

        {/* ── INLINE HINT IF SELECTED MONTH IS EMPTY ── */}
        {filtered.length === 0 && tickets.length > 0 && alternativeMonth && (
          <div className="mtp-inline-hint">
            <div className="hint-content">
              <span className="hint-icon">💡</span>
              <span className="hint-text">
                {selectedMonth !== "all" ? `Tháng ${selectedMonth}` : "Thời gian đã chọn"}{selectedYear !== "all" ? `/${selectedYear}` : ""} chưa có vé nào. Bạn đang có{" "}
                <strong>{alternativeMonth.count} vé</strong> trong{" "}
                <strong>
                  Tháng {alternativeMonth.month}/{alternativeMonth.year}
                </strong>
                .
              </span>
            </div>
            <div className="hint-actions">
              <button
                className="hint-jump-btn"
                onClick={() => {
                  setSelectedMonth(String(alternativeMonth.month));
                  setSelectedYear(String(alternativeMonth.year));
                }}
              >
                Xem vé Tháng {alternativeMonth.month}/{alternativeMonth.year} →
              </button>
              <button className="hint-all-btn" onClick={showAllMonths}>
                Xem tất cả ({tickets.length} vé)
              </button>
            </div>
          </div>
        )}

        {/* ── TICKET LIST / EMPTY STATES ── */}
        <div className="mtp-list">
          {loading ? (
            <div className="mtp-state">
              <div className="mtp-spinner" />
              <p>Đang tải danh sách vé của bạn…</p>
            </div>
          ) : error ? (
            <div className="mtp-state error">
              <p style={{ fontSize: 32 }}>⚠️</p>
              <p>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mtp-empty-card">
              <div className="empty-icon">🎫</div>
              <h3 className="empty-title">
                {selectedMonth === "all"
                  ? "Không tìm thấy vé nào phù hợp"
                  : `Không có vé nào trong Tháng ${selectedMonth}/${
                      selectedYear === "all" ? currentYearNum : selectedYear
                    }`}
              </h3>
              <p className="empty-desc">
                {selectedMonth !== "all"
                  ? "Bạn chưa có sự kiện âm nhạc nào diễn ra trong tháng đã chọn."
                  : "Bạn chưa có đơn đặt vé nào trong mục này."}
              </p>

              {/* Gợi ý thông minh nếu có vé ở tháng khác */}
              {alternativeMonth && (
                <div className="empty-suggestion">
                  <span>💡 Bạn đang có </span>
                  <strong>{alternativeMonth.count} vé</strong>
                  <span> diễn ra trong </span>
                  <strong>
                    Tháng {alternativeMonth.month}/{alternativeMonth.year}
                  </strong>
                  <button
                    className="jump-month-btn"
                    onClick={() => {
                      setSelectedMonth(String(alternativeMonth.month));
                      setSelectedYear(String(alternativeMonth.year));
                    }}
                  >
                    Xem vé Tháng {alternativeMonth.month}/{alternativeMonth.year} →
                  </button>
                </div>
              )}

              <div className="empty-actions">
                {tickets.length > 0 && (
                  <button className="btn-primary" onClick={showAllMonths}>
                    Xem toàn bộ {tickets.length} vé của tôi
                  </button>
                )}
                <Link to="/event" className="btn-secondary">
                  Khám phá sự kiện mới 🎵
                </Link>
              </div>
            </div>
          ) : (
            grouped.map((item, i) =>
              item.type === "separator" ? (
                <DateSeparator
                  key={`sep-${item.date}-${i}`}
                  date={item.date}
                  raw={item.raw}
                />
              ) : (
                <TicketCardItem
                  key={item.data.payment_detail_id || i}
                  ticket={item.data}
                  onClick={setSelected}
                />
              )
            )
          )}
        </div>

        {/* ── MODAL ── */}
        {selected && (
          <TicketModal ticket={selected} onClose={() => setSelected(null)} />
        )}

        {/* ── LOGIN MODAL ── */}
        {showLogin && (
          <div
            className="modal-overlay"
            onClick={() => setShowLogin(false)}
          >
            <div
              style={{ position: "relative", width: 360, maxWidth: "94vw" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowLogin(false)}
                className="modal-close"
                style={{ top: 12, right: 12 }}
              >
                ✕
              </button>
              <LoginPage />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}