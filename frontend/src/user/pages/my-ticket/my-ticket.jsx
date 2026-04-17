import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import "./my-ticket.css";
import LoginPage from "../login/Loginpage";
// ─── Helpers ──
const mapStatus = (s) => {
  if (s === "Thành công") return "success";
  if (s === "Đang xử lý") return "processing";
  if (s === "Đã hủy") return "cancelled";
  return "unknown";
};

const statusMeta = {
  success:    { label: "Đã thanh toán", color: "#22c55e", bg: "rgba(34,197,94,.12)" },
  processing: { label: "Đang xử lý",   color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  cancelled:  { label: "Đã hủy",       color: "#ef4444", bg: "rgba(239,68,68,.12)" },
  unknown:    { label: "Không rõ",      color: "#9ca3af", bg: "rgba(156,163,175,.12)" },
};

const usageLabel = (ticket) => {
  if (ticket.ticket_status === true) return { text: "Chưa sử dụng", used: true };
  return { text: "Đã sử dụng", used: false };
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

// ─── QR Canvas ──
function QRCanvas({ value, size = 168 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch(() => {});
  }, [value, size]);

  return <canvas ref={canvasRef} style={{ borderRadius: 12, display: "block" }} />;
}

// ─── InfoRow ──
function InfoRow({ icon, label, value, accent }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className={`info-value${accent ? " accent" : ""}`}>{value}</span>
    </div>
  );
}

function TicketModal({ ticket, onClose }) {
  const status = mapStatus(ticket.payment_status);
  const meta   = statusMeta[status];
  const { text: usageText, used } = usageLabel(ticket);
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

        {/* LEFT */}
        <div className="ticket-modal-left">
          <h1 className="ticket-title">{ticket.event_name}</h1>

          <div className="ticket-meta">
            <div className="ticket-meta-item">
              <strong>Ngày diễn ra:</strong> {fmt(ticket.event_end)}
            </div>
            <div className="ticket-meta-item">
              <strong>Địa chỉ:</strong> {ticket.event_location}
            </div>
            <div className="ticket-meta-item">
              <strong>Số lượng:</strong> {ticket.ticket_quantity} vé {ticket.zone_name}
            </div>
            <div className="ticket-meta-item">
              <strong>Phương thức:</strong> {ticket.method}
            </div>
            <div className="ticket-meta-item">
              <strong>Đơn giá:</strong> {ticket.price?.toLocaleString("vi-VN")} đ/vé
            </div>
            <div className="ticket-meta-item">
              <strong>Tổng đơn:</strong> {ticket.total_price?.toLocaleString("vi-VN")} đ
            </div>              
          </div>
        </div>

        {/* DIVIDER */}
        <div className="ticket-stub-line"></div>
        <div className="ticket-divider">
          <div className="ticket-dot top"></div>
          <div className="ticket-dot bottom"></div>
        </div>

        {/* RIGHT */}
        <div
          className="ticket-modal-right"
          style={{
                  backgroundImage: `url(${ticket.banner_url})`
                }}
        >
            <div className="ticket-modal-qr">
              {ticket.ticket_qr ? (
                <QRCanvas value={ticket.ticket_qr} size={250} />
              ) : (
                <div className="qr-placeholder">Không có QR</div>
              )}
            </div>
            <div className="ticket-footer">
              <div className="ticket-title-footer">Trạng thái</div>
              <div className="ticket-badges">
                <span className="ticket-badge" style={{ color: meta.color, background: meta.bg }}>
                  {meta.label}
                </span>
                <span className="ticket-badge" style={{
                  color: used ? "#0004ff" : "#ff0000",
                  background: used ? "rgba(99,102,241,.12)" : "rgba(100,116,139,.1)",
                }}>
                  {usageText}
                </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Card (list item) ──────────────────────────────────────────────────
function TicketCardItem({ ticket, onClick }) {
  const status = mapStatus(ticket.payment_status);
  const meta   = statusMeta[status];
  const { text: usageText, used } = usageLabel(ticket);

  return (
    <div className="tc-card" onClick={() => onClick(ticket)}>

      {/* Cột trái */}
      <div className="tc-left">
        <div style={{ fontSize: 28, lineHeight: 1 }}>🎫</div>
        <div className="tc-qty" style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>
          ×{ticket.ticket_quantity}
        </div>
      </div>

      {/* Cột giữa */}
      <div className="tc-middle">
        <div className="tc-event">{ticket.event_name}</div>
        <div className="tc-artist">
          {ticket.event_artist?.map((a) => a.name).join(" • ")}
        </div>
        <div className="tc-date">📅 {fmtDate(ticket.event_end)}</div>
        <div className="tc-loc">
          📍 {ticket.event_location?.split(",").slice(-2).join(",").trim()}
        </div>
      </div>

      {/* Cột phải */}
      <div className="tc-right">
        <div className="tc-price">
          {ticket.total_price}<span>đ</span>
        </div>
        <span className="tc-badge" style={{ color: meta.color, background: meta.bg }}>
          {meta.label}
        </span>
        <span className="tc-badge" style={{
          color:      used ? "#0004ff" : "#ff0000",
          background: used ? "rgba(99,102,241,.12)" : "rgba(100,116,139,.1)",
          fontSize: 10,
        }}>
          {usageText}
        </span>
        <div className="tc-qr-icon">Xem vé →</div>
      </div>

    </div>
  );
}

// ─── Filter config ────────────────────────────────────────────────────────────
const TAB_FILTERS = [
  { label: "Tất cả",      value: "all" },
  { label: "Thành công",  value: "success" },
  { label: "Đang xử lý", value: "processing" },
  { label: "Đã hủy",     value: "cancelled" },
];

const TIME_FILTERS = [
  { label: "Sắp diễn ra", value: "upcoming" },
  { label: "Đã kết thúc", value: "ended" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyTicket() {
  const [tickets,    setTickets]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [activeTab,  setActiveTab]  = useState("all");
  const [activeTime, setActiveTime] = useState("upcoming");
  const [selected,   setSelected]   = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const token    = localStorage.getItem("token");
  const API_BASE = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (!token) {
      setShowLogin(true); // 👈 mở popup thay vì return
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

  console.log(tickets)

    const filtered = tickets.filter((t) => {
    const matchTab  = activeTab === "all" || mapStatus(t.payment_status) === activeTab;
    const now       = new Date();
    const matchTime = activeTime === "upcoming"
      ? new Date(t.event_end) >= now
      : new Date(t.event_end) < now;
    return matchTab && matchTime;
  });

  return (
    <div className="mtp-root">

      {/* Header */}
      <div className="mtp-header">
        <h1 className="mtp-title">Vé của tôi</h1>
        <p className="mtp-sub">{tickets.length} vé • {filtered.length} hiển thị</p>
      </div>

      {/* Filters */}
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

      {/* List */}
      <div className="mtp-list">
        {loading ? (
          <div className="mtp-state">
            <div className="mtp-spinner" />
            <p>Đang tải vé…</p>
          </div>
        ) : error ? (
          <div className="mtp-state error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="mtp-state">
            <p style={{ fontSize: 32 }}>🎫</p>
            <p>Không có vé nào</p>
          </div>
        ) : (
          filtered.map((t) => (
            <TicketCardItem
              key={t.payment_detail_id}
              ticket={t}
              onClick={setSelected}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {selected && (
        <TicketModal ticket={selected} onClose={() => setSelected(null)} />
      )}
      {showLogin && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
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
                border: "none", background: "#1e293b",
                color: "#94a3b8", cursor: "pointer", fontSize: 13,
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