import React, { useEffect, useState } from 'react';
import './warning.css';

/**
 * Warning Notification Component
 * 
 * @param {Object} props
 * @param {string} props.message - Nội dung thông báo
 * @param {number} props.duration - Thời gian hiển thị (ms), mặc định 3500ms
 * @param {function} props.onClose - Callback khi đóng notification
 * @param {boolean} props.show - Hiển thị hay không
 */
export default function Warning({ 
  message = "Cảnh báo!", 
  duration = 3500, 
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
    <div className={`warning-notification ${visible ? 'visible' : ''}`}>
      <div className="warning-icon">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle className="warning-circle" cx="26" cy="26" r="25" fill="none"/>
          <path className="warning-line" fill="none" d="M26 14 v16"/>
          <circle className="warning-dot" cx="26" cy="38" r="2" fill="none"/>
        </svg>
      </div>
      <div className="warning-content">
        <h4 className="warning-title">Cảnh báo</h4>
        <p className="warning-message">{message}</p>
      </div>
      <button 
        className="warning-close" 
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