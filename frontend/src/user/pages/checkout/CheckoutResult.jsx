import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CheckoutResult.css";

export default function CheckoutResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // MoMo dùng resultCode, VNPay dùng vnp_ResponseCode
    const resultCode = searchParams.get("resultCode");
    const vnpCode = searchParams.get("vnp_ResponseCode");

    if (resultCode === "0" || vnpCode === "00") {
      setStatus("success");
    } else if (resultCode !== null || vnpCode !== null) {
      setStatus("fail");
    }
  }, [searchParams]);

  return (
    <div className="result-wrapper">
      {status === null && (
        <div className="result-card">
          <div className="result-spinner" />
          <p className="result-msg">Đang xử lý thanh toán...</p>
        </div>
      )}

      {status === "success" && (
        <div className="result-card">
          <div className="result-icon success">✓</div>
          <h2 className="result-title">Thanh toán thành công!</h2>
          <p className="result-desc">
            Cảm ơn bạn đã đặt vé. Thông tin chi tiết sẽ được gửi về email của bạn.
          </p>
          <div className="result-actions">
            <button className="btn-primary" onClick={() => navigate("/")}>
              Về trang chủ
            </button>
            <button className="btn-secondary" onClick={() => navigate("/my-tickets")}>
              Xem vé của tôi
            </button>
          </div>
        </div>
      )}

      {status === "fail" && (
        <div className="result-card">
          <div className="result-icon fail">✕</div>
          <h2 className="result-title">Thanh toán thất bại</h2>
          <p className="result-desc">
            Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.
          </p>
          <div className="result-actions">
            <button className="btn-primary" onClick={() => navigate("/my-cart")}>
              Quay lại giỏ hàng
            </button>
            <button className="btn-secondary" onClick={() => navigate("/")}>
              Về trang chủ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}