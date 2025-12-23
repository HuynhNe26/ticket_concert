import React, { useState, useRef, useEffect } from 'react';
import { 
  Move, Square, Pentagon, ZoomIn, ZoomOut, Save, 
  Trash2, Copy, Calendar, MapPin, Users, DollarSign,
  Clock, FileText
} from 'lucide-react';

// ==================== TYPES & CONSTANTS ====================
const SHAPE_TYPES = {
  RECT: 'rect',
  POLYGON: 'polygon'
};

const ZONE_TYPES = [
  { value: 'Sân khấu', label: 'Sân khấu' },
  { value: 'Đứng', label: 'Khu vực đứng' },
  { value: 'Ngồi', label: 'Khu vực ngồi' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Quản lý', label: 'Quản lý/Kỹ thuật' }
];

const PRESET_COLORS = [
  '#FF2D2D', '#00C7D9', '#00838F', '#2E7D8A', '#0D47A1',
  '#FFB74D', '#FF5A4F', '#FF3B7F', '#1E88E5', '#555555',
  '#888888', '#4CAF50', '#9C27B0', '#FFC107', '#E91E63'
];

const EVENT_CATEGORIES = [
  { value: 'concert', label: 'Hòa nhạc' },
  { value: 'festival', label: 'Lễ hội' },
  { value: 'conference', label: 'Hội nghị' },
  { value: 'sport', label: 'Thể thao' },
  { value: 'theater', label: 'Sân khấu' },
  { value: 'other', label: 'Khác' }
];

// ==================== DEFAULT LAYOUT ====================
const defaultLayout = {
  canvas: {
    width: 1200,
    height: 700,
    background: '#000000'
  },
  zones: []
};

// ==================== UTILITY FUNCTIONS ====================
const generateId = () => `ZONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getPolygonBounds = (points) => {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
};

const isPointInRect = (px, py, x, y, width, height) => {
  return px >= x && px <= x + width && py >= y && py <= y + height;
};

const isPointInPolygon = (px, py, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// ==================== LAYOUT TOOLBAR COMPONENT ====================
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

// ==================== CANVAS COMPONENT ====================
const Canvas = ({ layout, selectedZone, onSelectZone, onUpdateZone, zoom, onZoomIn, onZoomOut }) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);
  const [currentCursor, setCurrentCursor] = useState('grab');
  const HANDLE_SIZE = 8;

  const getResizeHandle = (x, y, zone) => {
    if (!zone || zone.shape !== SHAPE_TYPES.RECT) return null;
    
    const handleSize = HANDLE_SIZE / zoom;
    const { x: zx, y: zy, width, height } = zone;
    
    // Check corners first (priority)
    if (Math.abs(x - zx) < handleSize && Math.abs(y - zy) < handleSize) return 'nw';
    if (Math.abs(x - (zx + width)) < handleSize && Math.abs(y - zy) < handleSize) return 'ne';
    if (Math.abs(x - zx) < handleSize && Math.abs(y - (zy + height)) < handleSize) return 'sw';
    if (Math.abs(x - (zx + width)) < handleSize && Math.abs(y - (zy + height)) < handleSize) return 'se';
    
    // Check edges
    if (Math.abs(x - zx) < handleSize && y >= zy && y <= zy + height) return 'w';
    if (Math.abs(x - (zx + width)) < handleSize && y >= zy && y <= zy + height) return 'e';
    if (Math.abs(y - zy) < handleSize && x >= zx && x <= zx + width) return 'n';
    if (Math.abs(y - (zy + height)) < handleSize && x >= zx && x <= zx + width) return 's';
    
    return null;
  };

  const getCursorForHandle = (handle) => {
    const cursors = {
      'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize',
      'n': 'n-resize', 's': 's-resize', 'e': 'e-resize', 'w': 'w-resize'
    };
    return cursors[handle] || 'grab';
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicking on a resize handle of selected zone
    if (selectedZone && selectedZone.shape === SHAPE_TYPES.RECT) {
      const handle = getResizeHandle(x, y, selectedZone);
      if (handle) {
        setResizeHandle(handle);
        setIsDragging(true);
        setCurrentCursor(getCursorForHandle(handle));
        return;
      }
    }

    const clickedZone = layout.zones.slice().reverse().find(zone => {
      if (zone.shape === SHAPE_TYPES.RECT) {
        return isPointInRect(x, y, zone.x, zone.y, zone.width, zone.height);
      } else if (zone.shape === SHAPE_TYPES.POLYGON) {
        return isPointInPolygon(x, y, zone.points);
      }
      return false;
    });

    if (clickedZone) {
      onSelectZone(clickedZone);
      setIsDragging(true);
      setResizeHandle(null);
      setCurrentCursor('grabbing');
      
      if (clickedZone.shape === SHAPE_TYPES.RECT) {
        setDragOffset({ x: x - clickedZone.x, y: y - clickedZone.y });
      } else if (clickedZone.shape === SHAPE_TYPES.POLYGON) {
        const bounds = getPolygonBounds(clickedZone.points);
        setDragOffset({ x: x - bounds.minX, y: y - bounds.minY });
      }
    } else {
      onSelectZone(null);
      setResizeHandle(null);
      setCurrentCursor('grab');
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Update cursor when hovering over resize handles
    if (!isDragging && selectedZone && selectedZone.shape === SHAPE_TYPES.RECT) {
      const handle = getResizeHandle(x, y, selectedZone);
      setCurrentCursor(handle ? getCursorForHandle(handle) : 'grab');
    }

    if (!isDragging || !selectedZone) return;

    if (resizeHandle && selectedZone.shape === SHAPE_TYPES.RECT) {
      // Resizing
      const { x: zx, y: zy, width, height } = selectedZone;
      let newX = zx, newY = zy, newWidth = width, newHeight = height;

      switch(resizeHandle) {
        case 'nw':
          newX = x;
          newY = y;
          newWidth = width + (zx - x);
          newHeight = height + (zy - y);
          break;
        case 'ne':
          newY = y;
          newWidth = x - zx;
          newHeight = height + (zy - y);
          break;
        case 'sw':
          newX = x;
          newWidth = width + (zx - x);
          newHeight = y - zy;
          break;
        case 'se':
          newWidth = x - zx;
          newHeight = y - zy;
          break;
        case 'n':
          newY = y;
          newHeight = height + (zy - y);
          break;
        case 's':
          newHeight = y - zy;
          break;
        case 'w':
          newX = x;
          newWidth = width + (zx - x);
          break;
        case 'e':
          newWidth = x - zx;
          break;
      }

      // Minimum size constraint
      if (newWidth < 30) newWidth = 30;
      if (newHeight < 30) newHeight = 30;

      onUpdateZone({
        ...selectedZone,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    } else if (!resizeHandle) {
      // Moving
      if (selectedZone.shape === SHAPE_TYPES.RECT) {
        onUpdateZone({
          ...selectedZone,
          x: x - dragOffset.x,
          y: y - dragOffset.y
        });
      } else if (selectedZone.shape === SHAPE_TYPES.POLYGON) {
        const bounds = getPolygonBounds(selectedZone.points);
        const dx = (x - dragOffset.x) - bounds.minX;
        const dy = (y - dragOffset.y) - bounds.minY;
        
        onUpdateZone({
          ...selectedZone,
          points: selectedZone.points.map(p => [p[0] + dx, p[1] + dy])
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizeHandle(null);
    setCurrentCursor('grab');
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      onZoomIn();
    } else {
      onZoomOut();
    }
  };

  const drawZone = (ctx, zone, isSelected) => {
    ctx.save();
    
    if (zone.shape === SHAPE_TYPES.RECT) {
      ctx.fillStyle = zone.color;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([10 / zoom, 5 / zoom]);
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        
        // Draw resize handles
        const handleSize = HANDLE_SIZE / zoom;
        const handles = [
          { x: zone.x, y: zone.y }, // nw
          { x: zone.x + zone.width, y: zone.y }, // ne
          { x: zone.x, y: zone.y + zone.height }, // sw
          { x: zone.x + zone.width, y: zone.y + zone.height }, // se
          { x: zone.x + zone.width / 2, y: zone.y }, // n
          { x: zone.x + zone.width / 2, y: zone.y + zone.height }, // s
          { x: zone.x, y: zone.y + zone.height / 2 }, // w
          { x: zone.x + zone.width, y: zone.y + zone.height / 2 } // e
        ];
        
        ctx.setLineDash([]);
        handles.forEach(handle => {
          ctx.fillStyle = '#FFD700';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1 / zoom;
          ctx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      }
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${14 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, zone.x + zone.width / 2, zone.y + zone.height / 2);
      
    } else if (zone.shape === SHAPE_TYPES.POLYGON && zone.points?.length > 0) {
      ctx.beginPath();
      ctx.moveTo(zone.points[0][0], zone.points[0][1]);
      zone.points.forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      
      ctx.fillStyle = zone.color;
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([10 / zoom, 5 / zoom]);
        ctx.stroke();
        
        // Draw vertex handles for polygon
        const handleSize = HANDLE_SIZE / zoom;
        ctx.setLineDash([]);
        zone.points.forEach(point => {
          ctx.fillStyle = '#FFD700';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1 / zoom;
          ctx.beginPath();
          ctx.arc(point[0], point[1], handleSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      }
      
      const bounds = getPolygonBounds(zone.points);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${14 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, centerX, centerY);
    }
    
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = layout.canvas.width * dpr;
    canvas.height = layout.canvas.height * dpr;
    canvas.style.width = `${layout.canvas.width}px`;
    canvas.style.height = `${layout.canvas.height}px`;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, layout.canvas.width, layout.canvas.height);
    
    ctx.save();
    ctx.scale(zoom, zoom);
    
    ctx.fillStyle = layout.canvas.background;
    ctx.fillRect(0, 0, layout.canvas.width, layout.canvas.height);
    
    layout.zones.forEach(zone => {
      drawZone(ctx, zone, selectedZone?.id === zone.id);
    });
    
    ctx.restore();
  }, [layout, selectedZone, zoom]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{ fontSize: '13px', color: '#666' }}>
          Tổng zones: <strong>{layout.zones.length}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onZoomOut} style={zoomButtonStyle}>
            <ZoomOut size={16} />
          </button>
          <span style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 600 }}>
            {(zoom * 100).toFixed(0)}%
          </span>
          <button onClick={onZoomIn} style={zoomButtonStyle}>
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: currentCursor,
          display: 'block',
          boxShadow: '0 0 20px rgba(0,0,0,0.3)',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

const zoomButtonStyle = {
  padding: '6px 10px',
  background: '#f0f0f0',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center'
};

// ==================== ZONE EDITOR COMPONENT ====================
const ZoneEditor = ({ zone, onUpdate, onDelete, onDuplicate }) => {
  if (!zone) {
    return (
      <div style={{
        padding: '20px',
        color: '#999',
        textAlign: 'center',
        fontSize: '13px'
      }}>
        <MapPin size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
        <p>Chọn một zone để chỉnh sửa</p>
      </div>
    );
  }

  const handleChange = (field, value) => {
    onUpdate({ ...zone, [field]: value });
  };

  return (
    <div style={{
      padding: '15px',
      background: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h4 style={{ margin: 0, fontSize: '15px', color: '#333' }}>
          Chỉnh sửa Zone
        </h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onDuplicate} style={actionButtonStyle} title="Nhân bản">
            <Copy size={14} />
          </button>
          <button onClick={onDelete} style={{...actionButtonStyle, background: '#dc3545'}} title="Xóa">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <FormField label="ID" value={zone.id} onChange={(v) => handleChange('ID', v)} placeholder="" />
        <FormField 
          label="Tên Zone" 
          value={zone.name}
          onChange={(v) => handleChange('name', v)}
          placeholder="VD: VIP A, FANZONE..."
        />
        <FormSelect
          label="Loại"
          value={zone.type}
          options={ZONE_TYPES}
          onChange={(v) => handleChange('type', v)}
        />
        <FormField 
          label="Màu" 
          type="color"
          value={zone.color}
          onChange={(v) => handleChange('color', v)}
        />

        {zone.shape === SHAPE_TYPES.RECT && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FormField 
                label="X" 
                type="number"
                value={zone.x}
                onChange={(v) => handleChange('x', Number(v))}
              />
              <FormField 
                label="Y" 
                type="number"
                value={zone.y}
                onChange={(v) => handleChange('y', Number(v))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FormField 
                label="Rộng" 
                type="number"
                value={zone.width}
                onChange={(v) => handleChange('width', Number(v))}
              />
              <FormField 
                label="Cao" 
                type="number"
                value={zone.height}
                onChange={(v) => handleChange('height', Number(v))}
              />
            </div>
          </>
        )}

        {zone.price !== undefined && (
          <FormField 
            label="Giá vé (VNĐ)" 
            type="number"
            value={zone.price}
            onChange={(v) => handleChange('price', Number(v))}
          />
        )}

        {zone.total_quantity !== undefined && (
          <FormField 
            label="Số lượng" 
            type="number"
            value={zone.total_quantity}
            onChange={(v) => handleChange('total_quantity', Number(v))}
          />
        )}

        <FormField 
          label="Mô tả" 
          value={zone.description || ''}
          onChange={(v) => handleChange('description', v)}
          placeholder="Mô tả zone..."
          multiline
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px',
          background: 'white',
          borderRadius: '6px'
        }}>
          <input
            type="checkbox"
            checked={zone.status !== false}
            onChange={(e) => handleChange('status', e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Mở bán
          </label>
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, value, onChange, type = 'text', readOnly, placeholder, multiline }) => (
  <div>
    <label style={{
      display: 'block',
      marginBottom: '5px',
      fontSize: '12px',
      fontWeight: 600,
      color: '#555'
    }}>
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '13px',
          fontFamily: 'inherit',
          minHeight: '60px',
          resize: 'vertical'
        }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '13px',
          background: readOnly ? '#f5f5f5' : 'white'
        }}
      />
    )}
  </div>
);

const FormSelect = ({ label, value, options, onChange }) => (
  <div>
    <label style={{
      display: 'block',
      marginBottom: '5px',
      fontSize: '12px',
      fontWeight: 600,
      color: '#555'
    }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '13px',
        background: 'white',
        cursor: 'pointer'
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const actionButtonStyle = {
  padding: '6px 10px',
  background: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  fontSize: '12px'
};

// ==================== MAIN ADD EVENT COMPONENT ====================
export default function AddEvent() {
  // Event Info State
  const [eventInfo, setEventInfo] = useState({
    name: '',
    category: 'concert',
    date: '',
    time: '',
    venue: '',
    address: '',
    description: '',
    image: null
  });

  // Layout State
  const [layout, setLayout] = useState(defaultLayout);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#00C7D9');
  const [zoom, setZoom] = useState(1);

  const handleEventChange = (field, value) => {
    setEventInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRect = () => {
    const newZone = {
      id: generateId(),
      name: `ZONE_${layout.zones.length + 1}`,
      type: 'Ngồi',
      shape: SHAPE_TYPES.RECT,
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      color: selectedColor,
      price: 500000,
      total_quantity: 100,
      status: true,
      description: ''
    };
    setLayout(prev => ({ ...prev, zones: [...prev.zones, newZone] }));
    setSelectedZone(newZone);
  };

  const handleAddPolygon = () => {
    const newZone = {
      id: generateId(),
      name: `POLYGON_${layout.zones.length + 1}`,
      type: 'Đứng',
      shape: SHAPE_TYPES.POLYGON,
      points: [[200, 200], [300, 200], [350, 280], [250, 320], [150, 280]],
      color: selectedColor,
      price: 800000,
      total_quantity: 200,
      status: true,
      description: ''
    };
    setLayout(prev => ({ ...prev, zones: [...prev.zones, newZone] }));
    setSelectedZone(newZone);
  };

  const handleUpdateZone = (updatedZone) => {
    setLayout(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === updatedZone.id ? updatedZone : z)
    }));
    setSelectedZone(updatedZone);
  };

  const handleDeleteZone = () => {
    if (!selectedZone) return;
    if (window.confirm(`Xóa zone "${selectedZone.name}"?`)) {
      setLayout(prev => ({
        ...prev,
        zones: prev.zones.filter(z => z.id !== selectedZone.id)
      }));
      setSelectedZone(null);
    }
  };

  const handleDuplicateZone = () => {
    if (!selectedZone) return;
    const duplicated = {
      ...selectedZone,
      id: generateId(),
      name: `${selectedZone.name}_COPY`,
      x: selectedZone.x ? selectedZone.x + 20 : undefined,
      y: selectedZone.y ? selectedZone.y + 20 : undefined,
      points: selectedZone.points ? selectedZone.points.map(p => [p[0] + 20, p[1] + 20]) : undefined
    };
    setLayout(prev => ({ ...prev, zones: [...prev.zones, duplicated] }));
    setSelectedZone(duplicated);
  };

  const handleSubmit = () => {
    // Validation
    if (!eventInfo.name || !eventInfo.date || !eventInfo.venue) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin sự kiện!');
      return;
    }

    if (layout.zones.length === 0) {
      alert('⚠️ Vui lòng tạo ít nhất 1 zone!');
      return;
    }

    const dataToSend = {
      event: eventInfo,
      layout: layout
    };

    console.log('📤 DỮ LIỆU GỬI LÊN BACKEND:', JSON.stringify(dataToSend, null, 2));
    alert('✅ Tạo sự kiện thành công!\n\nKiểm tra console để xem dữ liệu JSON.');
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '30px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '25px 30px',
          color: 'white'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>
            ✨ Tạo Sự Kiện Mới
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Nhập thông tin sự kiện và thiết kế bố cục sơ đồ chỗ ngồi
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* SECTION 1: Thông tin sự kiện */}
          <div style={{
            marginBottom: '30px',
            padding: '25px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Calendar size={24} style={{ color: '#667eea' }} />
              Thông tin sự kiện
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              <div style={{ gridColumn: 'span 2' }}>
                <FormField
                  label="Tên sự kiện *"
                  value={eventInfo.name}
                  onChange={(v) => handleEventChange('name', v)}
                  placeholder="VD: Đêm nhạc Sơn Tùng MTP 2025"
                />
              </div>

              <FormSelect
                label="Thể loại *"
                value={eventInfo.category}
                options={EVENT_CATEGORIES}
                onChange={(v) => handleEventChange('category', v)}
              />

              <br />

              <FormField
                label="Ngày diễn ra *"
                type="date"
                value={eventInfo.date}
                onChange={(v) => handleEventChange('date', v)}
              />

              <FormField
                label="Thời gian *"
                type="time"
                value={eventInfo.time}
                onChange={(v) => handleEventChange('time', v)}
              />

              <FormField
                label="Ngày kết thúc *"
                type="date"
                value={eventInfo.date}
                onChange={(v) => handleEventChange('date', v)}
              />

              <FormField
                label="Thời gian *"
                type="time"
                value={eventInfo.time}
                onChange={(v) => handleEventChange('time', v)}
              />

              <div style={{ gridColumn: 'span 2' }}>
                <FormField
                  label="Địa chỉ chi tiết *"
                  value={eventInfo.address}
                  onChange={(v) => handleEventChange('address', v)}
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <FormField
                  label="Độ tuổi (xét độ tuổi này trở lên) *"
                  type="number"
                  value={eventInfo.age}
                  onChange={(v) => handleEventChange('age', v)}
                  placeholder="18"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <FormField
                  label="Mô tả sự kiện"
                  value={eventInfo.description}
                  onChange={(v) => handleEventChange('description', v)}
                  placeholder="Giới thiệu về sự kiện, nghệ sĩ tham gia..."
                  multiline
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#555'
                }}>
                  📷 Ảnh bìa sự kiện
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleEventChange('image', e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px dashed #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                />
                {eventInfo.image && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    background: '#e7f3ff',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#0066cc'
                  }}>
                    ✓ Đã chọn: {eventInfo.image.name}
                  </div>
                )}
              </div>

               <div style={{ gridColumn: 'span 2' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#555'
                }}>
                  📷 Ảnh mô tả sự kiện
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleEventChange('image', e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px dashed #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                />
                {eventInfo.image && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    background: '#e7f3ff',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#0066cc'
                  }}>
                    ✓ Đã chọn: {eventInfo.image.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Bố cục sơ đồ */}
          <div style={{
            marginBottom: '30px',
            padding: '25px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MapPin size={24} style={{ color: '#667eea' }} />
              Thiết kế bố cục sơ đồ chỗ
            </h2>

            <LayoutToolbar
              onAddRect={handleAddRect}
              onAddPolygon={handleAddPolygon}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
            />

            <div style={{
              gridTemplateColumns: '1fr 350px',
              gap: '20px',
              marginTop: '15px'
            }}>
              <Canvas
                layout={layout}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
                onUpdateZone={handleUpdateZone}
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
              />

              <ZoneEditor
                zone={selectedZone}
                onUpdate={handleUpdateZone}
                onDelete={handleDeleteZone}
                onDuplicate={handleDuplicateZone}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '15px',
            paddingTop: '20px',
            borderTop: '2px solid #e0e0e0'
          }}>
            <button
              onClick={() => {
                if (window.confirm('Hủy tạo sự kiện? Mọi thay đổi sẽ không được lưu.')) {
                  window.location.reload();
                }
              }}
              style={{
                padding: '12px 30px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Hủy bỏ
            </button>

            <button
              onClick={handleSubmit}
              style={{
                padding: '12px 40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              <Save size={18} />
              Tạo sự kiện
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}