import React, { useEffect, useState } from 'react';

export default function CartPage({ userId, eventId, zoneCode, initialQty }) {
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút tính bằng giây

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("Hết thời gian giữ chỗ!");
          window.location.reload(); // Load lại để cập nhật trạng thái
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="cart-wrapper">
      <div className="timer-banner">
        Thời gian hoàn tất thanh toán còn lại: <strong>{formatTime(timeLeft)}</strong>
      </div>
      
      <div className="cart-details">
        <h3>Vé sự kiện của bạn</h3>
        <p>Khu vực: {zoneCode}</p>
        <p>Số lượng: {initialQty}</p>
      </div>

      <button className="btn-pay" disabled={timeLeft === 0}>
        Thanh toán ngay
      </button>
    </div>
  );
}