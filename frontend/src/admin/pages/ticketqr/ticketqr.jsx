import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./ticketqr.css";

const API_BASE = process.env.REACT_APP_API_URL;

// ─── Config ──────────────────────────────────────────────────────────────────────
const RESULT_CONFIG = {
  success: {
    icon: "✓",
    title: "Check-in thành công!",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.3)",
    glow: "0 0 40px rgba(74,222,128,0.2)",
  },
  used: {
    icon: "✕",
    title: "Vé đã được sử dụng",
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.3)",
    glow: "0 0 40px rgba(248,113,113,0.2)",
  },
  notfound: {
    icon: "?",
    title: "Không tìm thấy vé",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.3)",
    glow: "0 0 40px rgba(251,191,36,0.2)",
  },
  error: {
    icon: "!",
    title: "Lỗi kết nối",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.3)",
    glow: "0 0 40px rgba(148,163,184,0.1)",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatVND(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("vi-VN") + " ₫";
}

// ─── Result Card ─────────────────────────────────────────────────────────────────
function ResultCard({ result, onReset }) {
  const cfg    = RESULT_CONFIG[result.type] || RESULT_CONFIG.error;
  const ticket = result.ticket;

  return (
    <div className="tqr-result-overlay">

      {/* Icon */}
      <div
        className="tqr-result-icon"
        style={{ border: `2px solid ${cfg.color}`, boxShadow: cfg.glow, color: cfg.color }}
      >
        {cfg.icon}
      </div>

      {/* Title */}
      <div className="tqr-result-title" style={{ color: cfg.color }}>
        {cfg.title}
      </div>
      {result.message && (
        <div className="tqr-result-message">{result.message}</div>
      )}

      {/* Ticket detail */}
      {ticket && (
        <div
          className="tqr-ticket-card"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <div className="tqr-ticket-event">{ticket.event_name}</div>
          <div className="tqr-ticket-ref">#{ticket.payment_ref}</div>

          <div className="tqr-ticket-grid">
            {[
              ["Khách hàng",   ticket.full_name || "—"],
              ["Khu vực",      ticket.zone_name || "—"],
              ["Số lượng",     `${ticket.ticket_quantity} vé`],
              ["Đơn giá",      formatVND(ticket.price)],
              ["Ngày diễn ra", fmt(ticket.event_end)],
              ["Địa điểm",     ticket.event_location?.split(",").slice(-2).join(",").trim() || "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="tqr-ticket-field-label">{label}</div>
                <div className="tqr-ticket-field-value">{val}</div>
              </div>
            ))}
          </div>

          <div className="tqr-ticket-total">
            <span className="tqr-ticket-total-label">Tổng đơn</span>
            <span className="tqr-ticket-total-value" style={{ color: cfg.color }}>
              {formatVND(ticket.total_price)}
            </span>
          </div>
        </div>
      )}

      {/* Reset button */}
      <button
        className="tqr-btn-reset"
        style={{ background: cfg.color, boxShadow: `0 4px 20px ${cfg.color}40` }}
        onClick={onReset}
      >
        Quét vé tiếp theo
      </button>
    </div>
  );
}

// ─── Scanner Overlay ──────────────────────────────────────────────────────────────
function ScannerOverlay({ scanning }) {
  return (
    <div className="tqr-overlay">
      <div className="tqr-vignette" />
      <div className="tqr-finder">
        <div className="tqr-corner tl" />
        <div className="tqr-corner tr" />
        <div className="tqr-corner bl" />
        <div className="tqr-corner br" />
        {scanning && <div className="tqr-scanline" />}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────────
export default function TicketQR() {
  const [scanning,    setScanning]    = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [result,      setResult]      = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [stats,       setStats]       = useState({ total: 0, success: 0, failed: 0 });

  const scannerRef = useRef(null);
  const token      = localStorage.getItem("authToken");

  // ── Start camera ────────────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraError("");
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleScan,
        () => {}
      );
      setScanning(true);
    } catch {
      setCameraError("Không thể truy cập camera. Vui lòng cấp quyền và thử lại.");
      scannerRef.current = null;
    }
  }, []); // eslint-disable-line

  // ── Stop camera ─────────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  // ── Scan handler → call API ─────────────────────────────────────────────────
  const handleScan = useCallback(async (qrValue) => {
    if (processing) return;
    setProcessing(true);
    await stopScanner();

    try {
      const res  = await fetch(`${API_BASE}/api/admin/ticket-qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_code: qrValue }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ type: "success", ticket: data.ticket, message: "Vé hợp lệ" });
        setStats(s => ({ ...s, total: s.total + 1, success: s.success + 1 }));
      } else if (res.status === 409) {
        setResult({ type: "used", ticket: data.ticket, message: data.message });
        setStats(s => ({ ...s, total: s.total + 1, failed: s.failed + 1 }));
      } else if (res.status === 404) {
        setResult({ type: "notfound", message: "Mã QR không tồn tại trong hệ thống" });
        setStats(s => ({ ...s, total: s.total + 1, failed: s.failed + 1 }));
      } else {
        setResult({ type: "error", message: data.message || "Lỗi không xác định" });
      }
    } catch {
      setResult({ type: "error", message: "Không thể kết nối máy chủ" });
    } finally {
      setProcessing(false);
    }
  }, [processing, token, stopScanner]);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setResult(null);
    startScanner();
  }, [startScanner]);

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="tqr-root">

      {/* ── Header ── */}
      <div className="tqr-header">
        <div>
          <div className="tqr-header-title">Check-in Scanner</div>
          <div className="tqr-header-sub">Quét mã QR trên vé</div>
        </div>

        <div className="tqr-stats">
          {[
            { label: "Tổng", value: stats.total,   color: "#94a3b8" },
            { label: "OK",   value: stats.success,  color: "#4ade80" },
            { label: "Lỗi",  value: stats.failed,   color: "#f87171" },
          ].map(({ label, value, color }) => (
            <div key={label} className="tqr-stat-item">
              <div className="tqr-stat-value" style={{ color }}>{value}</div>
              <div className="tqr-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Camera area ── */}
      <div className="tqr-body">

        <div className={`tqr-viewport ${scanning ? "scanning" : "idle"}`}>
          <div id="qr-reader" />

          {!scanning && (
            <div className="tqr-placeholder">
              <div className="tqr-placeholder-icon">▦</div>
              <div className="tqr-placeholder-text">Camera chưa bật</div>
            </div>
          )}

          <ScannerOverlay scanning={scanning} />

          {processing && (
            <div className="tqr-processing">
              <div className="tqr-spinner" />
              <div className="tqr-processing-text">Đang xác thực…</div>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="tqr-error">{cameraError}</div>
        )}

        {!scanning && !processing && (
          <button className="tqr-btn-start" onClick={startScanner}>
            📷 Bật camera
          </button>
        )}

        {scanning && (
          <div className="tqr-scanning-status">
            <div className="tqr-scanning-label">
              <span className="tqr-pulse-dot" />
              Đang quét…
            </div>
            <button className="tqr-btn-stop" onClick={stopScanner}>
              Dừng
            </button>
          </div>
        )}
      </div>

      {/* ── Result overlay ── */}
      {result && <ResultCard result={result} onReset={handleReset} />}
    </div>
  );
}