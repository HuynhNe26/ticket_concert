import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { SHAPE_TYPES, DEFAULT_LAYOUT } from '../add_event/add_event_component/constants/index_event.js';
import { generateId } from '../add_event/add_event_component/utils/index1_event.js';
import LayoutDesigner from '../add_event/add_event_component/LayoutDesigner.jsx';

const API_BASE = process.env.REACT_APP_API_URL;

export default function AddLayout() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#00C7D9');
  const [zoom, setZoom] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false); // Chế độ edit hay create

  // Load danh sách events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Load layout khi chọn event
  useEffect(() => {
    if (selectedEventId) {
      fetchLayoutByEventId(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin/events`);
      const result = await response.json();
      
      console.log('📥 Events response:', result);
      
      if (result.success && Array.isArray(result.data)) {
        setEvents(result.data);
      } else {
        console.error('Invalid events data:', result);
        setEvents([]);
      }
    } catch (error) {
      console.error('❌ Lỗi load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLayoutByEventId = async (eventId) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/layout/${eventId}`);
      const result = await response.json();
      
      console.log('📥 Layout response:', result);
      
      if (result.success && result.data.layout) {
        // Có layout rồi - chế độ EDIT
        setLayout(result.data.layout.layout_json);
        setIsEditMode(true);
        alert('✅ Đã load layout hiện tại. Bạn có thể chỉnh sửa.');
      } else {
        // Chưa có layout - chế độ CREATE
        setLayout(DEFAULT_LAYOUT);
        setIsEditMode(false);
        alert('ℹ️ Sự kiện này chưa có layout. Bạn có thể tạo mới.');
      }
    } catch (error) {
      console.error('❌ Lỗi load layout:', error);
      // Nếu lỗi 404 (chưa có layout) thì để DEFAULT
      setLayout(DEFAULT_LAYOUT);
      setIsEditMode(false);
    }
  };

  const handleAddRect = () => {
  // ✅ BẮT ADMIN NHẬP ID
  const zoneId = prompt('Nhập ID cho zone (VD: VIP_A, ZONE_1):');
  
  // ✅ KIỂM TRA KHÔNG ĐỂ TRỐNG
  if (!zoneId || zoneId.trim() === '') {
    alert('⚠️ ID không được để trống!');
    return;
  }

  // ✅ KIỂM TRA TRÙNG ID
  const isDuplicate = layout.zones.some(z => z.id === zoneId.trim());
  if (isDuplicate) {
    alert('⚠️ ID này đã tồn tại! Vui lòng chọn ID khác.');
    return;
  }

  const newZone = {
    id: zoneId.trim().toUpperCase(), // ✅ Chuyển thành chữ hoa
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
  setLayout({ ...layout, zones: [...layout.zones, newZone] });
  setSelectedZone(newZone);
};

const handleAddPolygon = () => {
  // ✅ BẮT ADMIN NHẬP ID
  const zoneId = prompt('Nhập ID cho zone (VD: SUPERFAN, FANZONE_A):');
  
  // ✅ KIỂM TRA KHÔNG ĐỂ TRỐNG
  if (!zoneId || zoneId.trim() === '') {
    alert('⚠️ ID không được để trống!');
    return;
  }

  // ✅ KIỂM TRA TRÙNG ID
  const isDuplicate = layout.zones.some(z => z.id === zoneId.trim());
  if (isDuplicate) {
    alert('⚠️ ID này đã tồn tại! Vui lòng chọn ID khác.');
    return;
  }

  const newZone = {
    id: zoneId.trim().toUpperCase(), // ✅ Chuyển thành chữ hoa
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
  setLayout({ ...layout, zones: [...layout.zones, newZone] });
  setSelectedZone(newZone);
};

  const handleUpdateZone = (updatedZone) => {
    setLayout({
      ...layout,
      zones: layout.zones.map(z => z.id === updatedZone.id ? updatedZone : z)
    });
    setSelectedZone(updatedZone);
  };

  const handleDeleteZone = () => {
    if (!selectedZone) return;
    if (window.confirm(`Xóa zone "${selectedZone.name}"?`)) {
      setLayout({
        ...layout,
        zones: layout.zones.filter(z => z.id !== selectedZone.id)
      });
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
    setLayout({ ...layout, zones: [...layout.zones, duplicated] });
    setSelectedZone(duplicated);
  };

  const handleSubmit = async () => {
    if (!selectedEventId) {
      alert('⚠️ Vui lòng chọn sự kiện!');
      return;
    }

    if (layout.zones.length === 0) {
      alert('⚠️ Vui lòng tạo ít nhất 1 zone!');
      return;
    }

    console.log('📤 Layout data:', { eventId: selectedEventId, layout });
    setIsSubmitting(true);

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE}/api/admin/layout/${selectedEventId}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ layout })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${isEditMode ? 'Cập nhật' : 'Thêm'} layout cho sự kiện thành công!`);
        // Refresh layout
        fetchLayoutByEventId(selectedEventId);
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error) {
      console.error('❌ Lỗi:', error);
      alert('❌ Không thể kết nối đến server!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '30px'
    }}>
      <div style={{
        maxWidth: '1500px',
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
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '28px', 
            fontWeight: 700 
          }}>
            🎨 Quản Lý Bố Cục Sự Kiện
          </h1>
          <p style={{ 
            margin: 0, 
            opacity: 0.9, 
            fontSize: '14px' 
          }}>
            Chọn sự kiện và {isEditMode ? 'chỉnh sửa' : 'tạo'} bố cục sơ đồ chỗ ngồi
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Select Event */}
          <div style={{
            marginBottom: '30px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '2px solid #e0e0e0'
          }}>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '10px',
              fontSize: '15px',
              color: '#333'
            }}>
              📅 Chọn Sự Kiện *
            </label>
            
            {loading ? (
              <p style={{ color: '#666', fontSize: '14px' }}>Đang tải danh sách sự kiện...</p>
            ) : (
              <>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: '15px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Chọn sự kiện --</option>
                  {Array.isArray(events) && events.map(event => (
                    <option key={event.event_id} value={event.event_id}>
                      {event.event_name} - {new Date(event.event_start).toLocaleDateString('vi-VN')}
                      {event.has_layout && ' ✅'}
                    </option>
                  ))}
                </select>
                
                {(!events || events.length === 0) && (
                  <p style={{ 
                    marginTop: '10px', 
                    color: '#dc3545',
                    fontSize: '14px'
                  }}>
                    ⚠️ Chưa có sự kiện nào. Vui lòng tạo sự kiện trước!
                  </p>
                )}

                {selectedEventId && (
                  <p style={{
                    marginTop: '10px',
                    color: isEditMode ? '#ff9800' : '#4caf50',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    {isEditMode ? '⚠️ Chế độ: CHỈNH SỬA layout hiện có' : '✨ Chế độ: TẠO MỚI layout'}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Layout Designer */}
          {selectedEventId && (
            <>
              <LayoutDesigner
                layout={layout}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
                onUpdateZone={handleUpdateZone}
                onDeleteZone={handleDeleteZone}
                onDuplicateZone={handleDuplicateZone}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
                onAddRect={handleAddRect}
                onAddPolygon={handleAddPolygon}
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
              />

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '15px',
                paddingTop: '20px',
                marginTop: '30px',
                borderTop: '2px solid #e0e0e0'
              }}>
                <button
                  onClick={() => {
                    if (window.confirm('Hủy thay đổi? Mọi thay đổi sẽ không được lưu.')) {
                      fetchLayoutByEventId(selectedEventId); // Reload layout
                    }
                  }}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 30px',
                    background: isSubmitting ? '#cccccc' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !isSubmitting && (e.target.style.background = '#5a6268')}
                  onMouseLeave={(e) => !isSubmitting && (e.target.style.background = '#6c757d')}
                >
                  Hủy bỏ
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 40px',
                    background: isSubmitting 
                      ? '#cccccc' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isSubmitting 
                      ? 'none' 
                      : '0 4px 15px rgba(102, 126, 234, 0.4)',
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !isSubmitting && (e.target.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => !isSubmitting && (e.target.style.transform = 'translateY(0)')}
                >
                  <Save size={18} />
                  {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật bố cục' : 'Tạo bố cục'}
                </button>
              </div>

              {/* Loading indicator */}
              {isSubmitting && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#1976d2',
                  fontWeight: 500
                }}>
                  <div style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '3px solid #1976d2',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginRight: '10px',
                    verticalAlign: 'middle'
                  }} />
                  Đang lưu bố cục...
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CSS Animation for loading spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}