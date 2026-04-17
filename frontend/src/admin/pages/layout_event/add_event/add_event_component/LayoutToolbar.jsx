import React, { useState } from 'react';
import { Square, Pentagon } from 'lucide-react';
import { PRESET_COLORS } from './constants/index_event';

const layoutToolButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  background: 'rgba(255,255,255,0.2)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'all 0.2s',
  backdropFilter: 'blur(10px)'
};

const LayoutToolbar = ({ onAddRect, onAddPolygon, selectedColor, onColorChange }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '15px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '8px',
      marginBottom: '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ color: 'white', margin: 0, marginRight: '20px', fontSize: '16px' }}>
        🎭 Thiết kế bố cục
      </h3>

      <button onClick={onAddRect} style={layoutToolButtonStyle} title="Thêm hình chữ nhật">
        <Square size={18} />
        <span>Chữ nhật</span>
      </button>

      <button onClick={onAddPolygon} style={layoutToolButtonStyle} title="Thêm đa giác">
        <Pentagon size={18} />
        <span>Đa giác</span>
      </button>

      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setShowColorPicker(!showColorPicker)} 
          style={{...layoutToolButtonStyle, gap: '8px'}}
          title="Chọn màu"
        >
          <div style={{
            width: '20px',
            height: '20px',
            background: selectedColor,
            borderRadius: '4px',
            border: '2px solid white'
          }} />
          <span>Màu</span>
        </button>
        
        {showColorPicker && (
          <div style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            zIndex: 2000
          }}>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => {
                  onColorChange(color);
                  setShowColorPicker(false);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  background: color,
                  border: selectedColor === color ? '3px solid #667eea' : '2px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  padding: 0
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutToolbar;