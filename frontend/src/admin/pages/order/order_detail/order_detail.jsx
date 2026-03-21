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
      try {
        setLoading(true);

        const response = await fetch(`${API_BASE}/api/admin/orders/order-detail/${id}`);
        const data = await response.json();

        if (data.success) {
          setOrder(data.data);
          console.log(data.data);
        }

      } catch (err) {
        console.error("Lỗi lấy đơn:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) getOrderById();
  }, [id]);

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

      {/* QR Code */}
        <div className="qr-wrapper">
          {order[0].ticket_qr ? (
            <QRCodeCanvas value={order[0].ticket_qr} size={150} />
          ) : (
            <div className="qr-placeholder">QR</div>
          )}
        </div>

      <div className="detail-card">
        <section className="detail-section">
          <h3 className="section-title">Thông tin người dùng</h3>
          <div className="info-grid">
            <Field label="Họ và tên" value={order[0].fullname} />
            <Field label="Số điện thoại" value={order[0].phonenumber} />
            <Field label="Giới tính" value={order[0].gender} />
            <Field label="Ngày sinh" value={new Date(order[0].birthofday).toLocaleString().slice(0, 9)} />
            <Field label="Hạng thành viên" value={order[0].membership} />
          </div>
        </section>

        <div className="section-divider" />

        {/* Ticket Info */}
        <section className="detail-section">
          <h3 className="section-title">Thông tin vé</h3>
          <div className="info-grid">
            <Field label="Tên sự kiện" value={order[0].event_name} />
            <Field label="Khu vé" value={order[0].zone_name} />
            <Field label="Tổng số vé" value={order[0].ticket_quantity} />
            <Field label="Đơn giá" value={formatCurrency(order[0].price)} />
            <Field label="Tổng tiền" value={formatCurrency(order[0].total_price)} />
            <Field label="Điểm tích lũy" value={order[0].total_price * 0.1} />
          </div>
        </section>

        <div className="section-divider" />

        {/* Transaction Info */}
        <section className="detail-section">
          <h3 className="section-title">Thông tin giao dịch</h3>
          <div className="info-grid">
            <Field label="Trạng thái vé" value={order[0].ticket_status} />
            <Field label="Mã giao dịch" value={order[0].payment_ref} />
            <Field
              label="Trạng thái giao dịch"
              value={order[0].payment_status}
              highlight={order[0].transactionStatus === "Thành công"}
            />
            <Field label="Thời gian sử dụng" value={order[0].usedat} />
            <Field label="Thời gian mua" value={new Date(order[0].created_at).toLocaleString().slice(0,21).split(",").reverse().join(", ")} />
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