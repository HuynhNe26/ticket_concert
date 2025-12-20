import React, { useEffect, useState } from 'react';
import './success.css';

/**
 * Success Notification Component
 * 
 * @param {Object} props
 * @param {string} props.message - Nội dung thông báo
 * @param {number} props.duration - Thời gian hiển thị (ms), mặc định 3000ms
 * @param {function} props.onClose - Callback khi đóng notification
 * @param {boolean} props.show - Hiển thị hay không
 */
export default function Success({ 
  message = "Thành công!", 
  duration = 3000, 
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
        }, 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className={`success-notification ${visible ? 'visible' : ''}`}>
      <div className="success-icon">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle className="success-circle" cx="26" cy="26" r="25" fill="none"/>
          <path className="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
      </div>
      <div className="success-content">
        <h4 className="success-title">Thành công</h4>
        <p className="success-message">{message}</p>
      </div>
      <button 
        className="success-close" 
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