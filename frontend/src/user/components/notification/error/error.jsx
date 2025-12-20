import React, { useEffect, useState } from 'react';
import './error.css';

/**
 * Error Notification Component
 * 
 * @param {Object} props
 * @param {string} props.message - Nội dung thông báo
 * @param {number} props.duration - Thời gian hiển thị (ms), mặc định 4000ms
 * @param {function} props.onClose - Callback khi đóng notification
 * @param {boolean} props.show - Hiển thị hay không
 */
export default function Error({ 
  message = "Đã có lỗi xảy ra!", 
  duration = 4000, 
  onClose,
  show = true 
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Trigger animation
      setVisible(true);

      // Auto close after duration
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          if (onClose) onClose();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className={`error-notification ${visible ? 'visible' : ''}`}>
      <div className="error-icon">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle className="error-circle" cx="26" cy="26" r="25" fill="none"/>
          <path className="error-cross error-cross-1" fill="none" d="M16 16 36 36"/>
          <path className="error-cross error-cross-2" fill="none" d="M36 16 16 36"/>
        </svg>
      </div>
      <div className="error-content">
        <h4 className="error-title">Lỗi</h4>
        <p className="error-message">{message}</p>
      </div>
      <button 
        className="error-close" 
        onClick={() => {
          setVisible(false);
          setTimeout(() => {
            if (onClose) onClose();
          }, 300);
        }}
        aria-label="Đóng"
      >
        ×
      </button>
    </div>
  );
}