import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode"
import "./ticketqr.css";

const API_BASE = process.env.REACT_APP_API_URL || "";

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

const STATUS_CFG = {
  pending:   { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.25)",   icon: "?", label: "Chờ xác nhận" },
  confirmed: { color: "#4ade80", bg: "rgba(74,222,128,0.08)",   border: "rgba(74,222,128,0.25)",   icon: "✓", label: "Check-in thành công!" },
  used:      { color: "#f87171", bg: "rgba(248,113,113,0.08)",  border: "rgba(248,113,113,0.25)",  icon: "✕", label: "Vé đã sử dụng" },
  notfound:  { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)", icon: "!", label: "Không tìm thấy vé" },
  error:     { color: "#f87171", bg: "rgba(248,113,113,0.08)",  border: "rgba(248,113,113,0.25)",  icon: "!", label: "Lỗi kết nối" },
};

// ─── Info Panel ───────────────────────────────────────────────────────────────
function InfoPanel({ scan, onConfirm, onDiscard, confirming }) {
  if (!scan) {
    return (
      <div className="tqr-info-panel">
        <div className="tqr-empty">
          <div className="tqr-empty-icon">🎫</div>
          <div className="tqr-empty-text">
            Đưa mã QR vào khung camera<br />để bắt đầu kiểm tra vé
          </div>
        </div>
      </div>
    );
  }

  const cfg    = STATUS_CFG[scan.status] || STATUS_CFG.error;
  const ticket = scan.ticket;

  return (
    <div className="tqr-info-panel">
      <div
        className="tqr-result-card"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        {/* Header */}
        <div className="tqr-result-header">
          <div
            className="tqr-result-icon-small"
            style={{ background: `${cfg.color}20`, color: cfg.color, border: `1.5px solid ${cfg.color}40` }}
          >
            {cfg.icon}
          </div>
          <div>
            <div className="tqr-result-title" style={{ color: cfg.color }}>
              {cfg.label}
            </div>
            {scan.message && (
              <div className="tqr-result-subtitle">{scan.message}</div>
            )}
          </div>
        </div>

        {/* Ticket info */}
        {ticket && (
          <div className="tqr-field-grid">
            {[
              ["Sự kiện",  ticket.event_name],
              ["Mã đơn",   `#${ticket.payment_ref}`],
              ["Khu vực",  ticket.zone_name || "—"],
              ["Số lượng", `${ticket.ticket_quantity} vé`],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="tqr-field-label">{label}</div>
                <div className="tqr-field-value">{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions — chỉ hiện khi pending */}
        {scan.status === "pending" && (
          <div className="tqr-actions">
            <button className="tqr-btn-cancel" onClick={onDiscard} disabled={confirming}>
              Bỏ qua
            </button>
            <button
              className="tqr-btn-confirm"
              style={{ background: "#4ade80", color: "#0f172a", boxShadow: "0 4px 16px rgba(74,222,128,0.3)" }}
              onClick={onConfirm}
              disabled={confirming}
            >
              {confirming ? "Đang xử lý…" : "✓ Xác nhận check-in"}
            </button>
          </div>
        )}

        {/* Banner kết quả */}
        {(scan.status === "confirmed" || scan.status === "used") && (
          <div
            className="tqr-banner"
            style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
          >
            {scan.status === "confirmed"
              ? "✓ Đã check-in thành công — có thể quét vé tiếp theo"
              : "✕ Vé này đã được sử dụng trước đó"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TicketQR() {
  const [scanning,    setScanning]    = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scan,        setScan]        = useState(null);
  const [confirming,  setConfirming]  = useState(false);
  const [stats,       setStats]       = useState({ total: 0, success: 0, failed: 0 });

  const scannerRef    = useRef(null);
  const processingRef = useRef(false);
  const handleScanRef = useRef(null);
  const token         = localStorage.getItem("authToken");

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // ── Start camera — dùng facingMode: environment cho camera sau mobile ─────
  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraError("");
    processingRef.current = false;
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: { exact: "environment" } }, // ← camera sau, báo lỗi nếu không có
        { fps: 15, qrbox: { width: 220, height: 220 } },
        (qrValue) => handleScanRef.current(qrValue),
        () => {}
      );
      setScanning(true);
    } catch {
      // Fallback: nếu exact "environment" fail (desktop/một số dt) thì thử ideal
      try {
        await scannerRef.current?.stop().catch(() => {});
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" }, // ← ideal, không bắt buộc camera sau
          { fps: 15, qrbox: { width: 220, height: 220 } },
          (qrValue) => handleScanRef.current(qrValue),
          () => {}
        );
        setScanning(true);
      } catch {
        setCameraError("Không thể truy cập camera. Vui lòng cấp quyền và thử lại.");
        scannerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []); // eslint-disable-line

  // ── Bước 1: Quét QR → hiện thông tin, chưa check-in ─────────────────────
  handleScanRef.current = async (qrValue) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const res  = await fetch(`${API_BASE}/api/admin/ticket-qr/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_code: qrValue }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setScan({ status: "pending", ticket: data.ticket, qr_code: qrValue, message: "Kiểm tra thông tin và xác nhận check-in" });
      } else if (res.status === 409) {
        setScan({ status: "used", ticket: data.ticket, message: data.message });
        setStats(s => ({ ...s, total: s.total + 1, failed: s.failed + 1 }));
      } else if (res.status === 404) {
        setScan({ status: "notfound", message: "Mã QR không tồn tại trong hệ thống" });
        setStats(s => ({ ...s, total: s.total + 1, failed: s.failed + 1 }));
      } else {
        setScan({ status: "error", message: data.message || "Lỗi không xác định" });
      }
    } catch (err) {
      setScan({ status: "error", message: err.message });
    } finally {
      processingRef.current = false;
    }
  };

  // ── Bước 2: Xác nhận → check-in thật ────────────────────────────────────
  const handleConfirm = async () => {
    if (!scan?.qr_code) return;
    setConfirming(true);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/ticket-qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_code: scan.qr_code }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setScan(s => ({ ...s, status: "confirmed", message: "Check-in thành công" }));
        setStats(s => ({ ...s, total: s.total + 1, success: s.success + 1 }));
      } else if (res.status === 409) {
        setScan(s => ({ ...s, status: "used", message: data.message }));
        setStats(s => ({ ...s, total: s.total + 1, failed: s.failed + 1 }));
      } else {
        setScan(s => ({ ...s, status: "error", message: data.message || "Lỗi không xác định" }));
      }
    } catch (err) {
      setScan(s => ({ ...s, status: "error", message: err.message }));
    } finally {
      setConfirming(false);
    }
  };

  // ── Bỏ qua → reset panel, camera tiếp tục ────────────────────────────────
  const handleDiscard = () => {
    setScan(null);
    processingRef.current = false;
    if (!scannerRef.current) startScanner();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="tqr-root">

      {/* Header */}
      <div className="tqr-header">
        <div className="tqr-header-left">
          <div className="tqr-header-title">Check-in Scanner</div>
          <div className="tqr-header-sub">Quét mã QR — xác nhận — check-in</div>
        </div>
        <div className="tqr-stats">
          {[
            { label: "Tổng", value: stats.total,   color: "#94a3b8" },
            { label: "OK",   value: stats.success,  color: "#4ade80" },
            { label: "Lỗi",  value: stats.failed,   color: "#f87171" },
          ].map(({ label, value, color }) => (
            <div key={label} className="tqr-stat">
              <div className="tqr-stat-value" style={{ color }}>{value}</div>
              <div className="tqr-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="tqr-body">

        {/* Trái: camera */}
        <div className="tqr-camera-panel">
          <div className={`tqr-viewport ${scanning ? "scanning" : "idle"}`}>
            <div id="qr-reader" />

            {!scanning && (
              <div className="tqr-placeholder">
                <div className="tqr-placeholder-icon">▦</div>
                <div className="tqr-placeholder-text">Camera chưa bật</div>
              </div>
            )}

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
          </div>

          {cameraError && <div className="tqr-error">{cameraError}</div>}

          {!scanning && (
            <button className="tqr-btn-start" onClick={startScanner}>
              📷 Bật camera
            </button>
          )}

          {scanning && (
            <div className="tqr-cam-status">
              <span className="tqr-pulse-dot" />
              Đang quét…
            </div>
          )}
        </div>

        {/* Phải: thông tin vé */}
        <InfoPanel
          scan={scan}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
          confirming={confirming}
        />
      </div>
    </div>
  );
}