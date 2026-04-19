import { useState } from "react";
import './event_toggle.css'

export default function EventToggle({ initialStatus = false, onChange }) {
  // initialStatus: trạng thái ban đầu của sự kiện
  const [isActive, setIsActive] = useState(initialStatus);

  const handleToggle = () => {
    const newStatus = !isActive;   
    setIsActive(newStatus);        
    if (onChange) onChange(newStatus); 
  };

  return (
    <label className="status">
      <input
        className="status-input"
        type="checkbox"
        checked={isActive}     // đồng bộ checkbox với state
        onChange={handleToggle} 
      />
      <span className="toggle-slider1" />
      <span style={{marginLeft: '10px', color: 'white'}}>
        {isActive ? "Đang mở" : "Đã tắt"}
      </span>
    </label>
  );
}