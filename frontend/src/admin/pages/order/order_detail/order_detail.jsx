import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import "./order_detail.css";
import LoadingAdmin from "../../../components/loading/loading";

const API_BASE = process.env.REACT_APP_API_URL;

export default function OrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);

  const formatCurrency = (amount) => {
    if (amount == null) return "";
    return Number(amount).toLocaleString("vi-VN");
  }; 

  useEffect(() => {
    const getOrderById = async () => {
      setLoading(true);
      // if (!id) {
      //   if (confirm("Lỗi lấy thông tin! Thử lại?")) {
      //     window.location.reload();
      //   }
      // }

      const response = await fetch(`${API_BASE}/api/admins/orders/order-detail/${id}`)
    }
  }, [])

  if (loading) {
    return <LoadingAdmin />
  }

  if (!order) {
    return (
      <div className="loading-wrapper">
        <p>Không có đơn hàng trong sự kiện này.</p>
        <button className="back-btn" onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>Quay lại</button>

      <div className="detail-card">
        {/* QR Code */}
        <div className="qr-wrapper">
          {order.qrValue ? (
            <QRCodeCanvas value={order.qrValue} size={200} />
          ) : (
            <div className="qr-placeholder">QR</div>
          )}
        </div>
        <section className="detail-section">
          <h3 className="section-title">Thông tin người dùng</h3>
          <div className="info-grid">
            <Field label="Họ và tên" value={order.fullName} />
            <Field label="Số điện thoại" value={order.phone} />
            <Field label="Giới tính" value={order.gender} />
            <Field label="Ngày sinh" value={order.birthday} />
            <Field label="Hạng thành viên" value={order.member} />
          </div>
        </section>

        <div className="section-divider" />

        {/* Ticket Info */}
        <section className="detail-section">
          <h3 className="section-title">Thông tin vé</h3>
          <div className="info-grid">
            <Field label="Tên sự kiện" value={order.eventName} />
            <Field label="Khu vé" value={order.zone} />
            <Field label="Tổng số vé" value={order.totalTickets} />
            <Field label="Đơn giá" value={formatCurrency(order.unitPrice)} />
            <Field label="Tổng tiền" value={formatCurrency(order.totalAmount)} />
            <Field label="Điểm tích lũy" value={order.Points} />
          </div>
        </section>

        <div className="section-divider" />

        {/* Transaction Info */}
        <section className="detail-section">
          <h3 className="section-title">Thông tin giao dịch</h3>
          <div className="info-grid">
            <Field label="Trạng thái vé" value={order.ticketStatus} />
            <Field label="Mã giao dịch" value={order.transactionCode} />
            <Field
              label="Trạng thái giao dịch"
              value={order.transactionStatus}
              highlight={order.transactionStatus === "Thành công"}
            />
            <Field label="Thời gian sử dụng" value={order.usedAt} />
            <Field label="Thời gian mua" value={order.purchasedAt} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }) {
  return (
    <div className="info-field">
      <span className="field-label">* {label}</span>
      <span className={`field-value${highlight ? " highlight" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}