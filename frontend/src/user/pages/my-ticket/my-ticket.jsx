import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import "./my-ticket.css";
import LoginPage from "../login/Loginpage";

const API_BASE = process.env.REACT_APP_API_URL;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const mapStatus = (s) => {
  if (s === "Thành công") return "success";
  return "unknown";
};

const statusMeta = {
  success: { label: "Đã thanh toán", color: "#4ade80", bg: "rgba(74,222,128,.12)", border: "rgba(74,222,128,.25)" },
  unknown: { label: "Không rõ",      color: "#94a3b8", bg: "rgba(148,163,184,.1)",  border: "rgba(148,163,184,.2)"  },
};

const usageLabel = (ticket) => {
  if (ticket.ticket_status === false)
    return { text: "Chưa sử dụng", color: "#60a5fa", bg: "rgba(96,165,250,.12)", border: "rgba(96,165,250,.25)" };
  return { text: "Đã sử dụng", color: "#f87171", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.2)" };
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatVND(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("vi-VN") + " đ";
}

// ─── Group tickets by purchase date ────────────────────────────────────────────
function groupByPurchaseDate(tickets) {
  const sorted = [...tickets].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const groups = [];
  let lastDateKey = null;

  sorted.forEach((t) => {
    const dateKey = t.created_at
      ? new Date(t.created_at).toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric",
        })
      : "Không rõ ngày";

    if (dateKey !== lastDateKey) {
      groups.push({ type: "separator", date: dateKey, raw: t.created_at });
      lastDateKey = dateKey;
    }
    groups.push({ type: "ticket", data: t });
  });

  return groups;
}

// ─── Date Separator ─────────────────────────────────────────────────────────────
function DateSeparator({ date, raw }) {
  const now       = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const rawDate   = raw ? new Date(raw) : null;

  const isToday     = rawDate && rawDate.toDateString() === now.toDateString();
  const isYesterday = rawDate && rawDate.toDateString() === yesterday.toDateString();

  const label = isToday ? "Hôm nay" : isYesterday ? "Hôm qua" : null;

  return (
    <div className="date-separator">
      <div className="date-separator-line" />
      <div className="date-separator-pill">
        {label && <span className="date-sep-highlight">{label}&nbsp;·&nbsp;</span>}
        <span>{date}</span>
      </div>
      <div className="date-separator-line" />
    </div>
  );
}

// ─── QR Canvas ──────────────────────────────────────────────────────────────────
function QRCanvas({ value, size = 140 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => {});
  }, [value, size]);
  return <canvas ref={canvasRef} style={{ borderRadius: 10, display: "block" }} />;
}

// ─── Ticket Modal ───────────────────────────────────────────────────────────────
function TicketModal({ ticket, onClose }) {
  const status = mapStatus(ticket.payment_status);
  const meta   = statusMeta[status];
  const usage  = usageLabel(ticket);

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
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* ── BANNER ── */}
        <div className="ticket-modal-banner">
          {ticket.banner_url ? (
            <img
              className="ticket-modal-banner-img"
              src={ticket.banner_url}
              alt={ticket.event_name}
            />
          ) : (
            <div className="ticket-modal-banner-fallback">🎫</div>
          )}
          <div className="ticket-modal-banner-overlay" />
          <div className="ticket-modal-event-title">{ticket.event_name}</div>
        </div>

        {/* ── BODY ── */}
        <div className="ticket-modal-body">

          {/* LEFT */}
          <div className="ticket-modal-left">

            {/* Order code */}
            <div className="ticket-order-code">
              <span className="ticket-order-code-label">Mã đơn hàng</span>
              <span className="ticket-order-code-value">#{ticket.payment_ref}</span>
            </div>

            {/* Meta grid */}
            <div className="ticket-meta-grid">
              <div className="ticket-meta-item full">
                <div className="ticket-meta-label">Ngày thanh toán</div>
                <div className="ticket-meta-value">{fmt(ticket.created_at)}</div>
              </div>

              <div className="ticket-meta-item full">
                <div className="ticket-meta-label">Ngày diễn ra</div>
                <div className="ticket-meta-value">{fmt(ticket.event_end)}</div>
              </div>

              <div className="ticket-meta-item full">
                <div className="ticket-meta-label">Địa điểm</div>
                <div className="ticket-meta-value">{ticket.event_location || "—"}</div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Khu vực</div>
                <div className="ticket-meta-value">{ticket.zone_name || "—"}</div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Số lượng</div>
                <div className="ticket-meta-value highlight">{ticket.ticket_quantity} vé</div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Đơn giá</div>
                <div className="ticket-meta-value">{formatVND(ticket.price)}</div>
              </div>

              <div className="ticket-meta-item">
                <div className="ticket-meta-label">Phương thức</div>
                <div className="ticket-meta-value">{ticket.method || "—"}</div>
              </div>
            </div>

            {/* Total price */}
            <div className="ticket-price-row">
              <span className="ticket-price-label">Tổng đơn hàng</span>
              <span className="ticket-price-amount">{formatVND(ticket.total_price)}</span>
            </div>

          </div>

          {/* RIGHT */}
          <div className="ticket-modal-right">

            {/* QR */}
            <div className="ticket-qr-wrap">
              <span className="ticket-qr-label">Quét để check-in</span>
              {ticket.ticket_qr ? (
                <QRCanvas value={ticket.ticket_qr} size={140} />
              ) : (
                <div className="qr-placeholder">Không có QR</div>
              )}
            </div>

            {/* Status */}
            <div className="ticket-status-block">
              <span className="ticket-status-title">Trạng thái</span>
              <div className="ticket-status-badges">
                <span
                  className="ticket-status-badge"
                  style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                >
                  {meta.label}
                </span>
                <span
                  className="ticket-status-badge"
                  style={{ color: usage.color, background: usage.bg, border: `1px solid ${usage.border}` }}
                >
                  {usage.text}
                </span>
              </div>
            </div>

            {ticket.zone_name && (
              <div className="ticket-zone-badge">
                Khu vực: {ticket.zone_name}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card (list item) ────────────────────────────────────────────────────
function TicketCardItem({ ticket, onClick }) {
  const status = mapStatus(ticket.payment_status);
  const meta   = statusMeta[status];
  const usage  = usageLabel(ticket);

  return (
    <div className="tc-card" onClick={() => onClick(ticket)}>

      <div className="tc-left">
        <div className="tc-left-icon">🎫</div>
        <div className="tc-qty">×{ticket.ticket_quantity}</div>
      </div>

      <div className="tc-middle">
        <div className="tc-event">{ticket.event_name}</div>
        <div className="tc-date">📅 {fmtDate(ticket.event_end)}</div>
        <div className="tc-loc">
          📍 {ticket.event_location?.split(",").slice(-2).join(",").trim() || "—"}
        </div>
        {/* <div className="tc-purchased">
          🕐 Mua lúc: {fmt(ticket.created_at)}
        </div> */}
      </div>

      <div className="tc-right">
        <div className="tc-price">
          {Number(ticket.total_price).toLocaleString("vi-VN")}
          <span>đ</span>
        </div>
        <span
          className="tc-badge"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
        <span
          className="tc-badge"
          style={{ color: usage.color, background: usage.bg }}
        >
          {usage.text}
        </span>
        <div className="tc-qr-icon">Xem vé →</div>
      </div>

    </div>
  );
}

// ─── Filter config ──────────────────────────────────────────────────────────────
const TAB_FILTERS = [
  { label: "Tất cả", value: "all" },
];

const TIME_FILTERS = [
  { label: "Sắp diễn ra", value: "upcoming" },
  { label: "Đã kết thúc", value: "ended" },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function MyTicket() {
  const [tickets,    setTickets]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [activeTab,  setActiveTab]  = useState("all");
  const [activeTime, setActiveTime] = useState("upcoming");
  const [selected,   setSelected]   = useState(null);
  const [showLogin,  setShowLogin]  = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setShowLogin(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/my-ticket`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTickets(d.data);
        else setError(d.message);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = tickets.filter((t) => {
    const matchTab  = activeTab === "all" || mapStatus(t.payment_status) === activeTab;
    const now       = new Date();
    const matchTime = activeTime === "upcoming"
      ? new Date(t.event_end) >= now
      : new Date(t.event_end) < now;
    return matchTab && matchTime;
  });

  const grouped = groupByPurchaseDate(filtered);

  return (
    <div className="mtp-root">

      <div className="mtp-header">
        <h1 className="mtp-title">VÉ CỦA TÔI</h1>
      </div>

      <div className="mtp-filters">
        <div className="filter-group">
          {TAB_FILTERS.map((t) => (
            <button
              key={t.value}
              className={`filter-btn${activeTab === t.value ? " active" : ""}`}
              onClick={() => setActiveTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {TIME_FILTERS.map((t) => (
            <button
              key={t.value}
              className={`filter-btn time${activeTime === t.value ? " active" : ""}`}
              onClick={() => setActiveTime(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mtp-list">
        {loading ? (
          <div className="mtp-state">
            <div className="mtp-spinner" />
            <p>Đang tải vé…</p>
          </div>
        ) : error ? (
          <div className="mtp-state error">{error}</div>
        ) : grouped.length === 0 ? (
          <div className="mtp-state">
            <p style={{ fontSize: 32 }}>🎫</p>
            <p>Không có vé nào</p>
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
                key={item.data.payment_detail_id}
                ticket={item.data}
                onClick={setSelected}
              />
            )
          )
        )}
      </div>

      {selected && (
        <TicketModal ticket={selected} onClose={() => setSelected(null)} />
      )}

      {showLogin && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.75)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowLogin(false)}
        >
          <div
            style={{ position: "relative", width: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLogin(false)}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 30, height: 30, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,.1)",
                background: "#1e293b", color: "#94a3b8",
                cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1,
              }}
            >✕</button>
            <LoginPage />
          </div>
        </div>
      )}
    </div>
  );
}