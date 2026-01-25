import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { SHAPE_TYPES, DEFAULT_LAYOUT } from '../add_event/add_event_component/constants/index_event.js';
import { generateId } from '../add_event/add_event_component/utils/index1_event.js';
import LayoutDesigner from '../add_event/add_event_component/LayoutDesigner.jsx';

const API_BASE = process.env.REACT_APP_API_URL;

export default function AddLayout() {
  const { id } = useParams(); // Lấy event_id từ URL: /admin/layout/add/:id
  const navigate = useNavigate();
  
  const [eventInfo, setEventInfo] = useState(null);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#00C7D9');
  const [zoom, setZoom] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventAndLayout();
    } else {
      alert('⚠️ Thiếu ID sự kiện!');
      navigate('/admin/events');
    }
  }, [id]);

  const fetchEventAndLayout = async () => {
    try {
      setLoading(true);
      
      // Load thông tin event
      const eventResponse = await fetch(`${API_BASE}/api/admin/events/${id}`);
      const eventResult = await eventResponse.json();
      
      console.log('📥 Event response:', eventResult);
      
      if (eventResult.success) {
        setEventInfo(eventResult.data);
      } else {
        alert('❌ Không tìm thấy sự kiện!');
        navigate('/admin/events');
        return;
      }

      // Load layout (nếu có)
      try {
        const layoutResponse = await fetch(`${API_BASE}/api/admin/layout/${id}`);
        const layoutResult = await layoutResponse.json();
        
        console.log('📥 Layout response:', layoutResult);
        
        if (layoutResult.success && layoutResult.data.layout) {
          setLayout(layoutResult.data.layout.layout_json);
          setIsEditMode(true);
          console.log('✅ Chế độ EDIT - Đã load layout');
        } else {
          setLayout(DEFAULT_LAYOUT);
          setIsEditMode(false);
          console.log('✨ Chế độ CREATE - Tạo layout mới');
        }
      } catch (layoutError) {
        console.log('ℹ️ Chưa có layout');
        setLayout(DEFAULT_LAYOUT);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('❌ Lỗi load dữ liệu:', error);
      alert('❌ Không thể kết nối đến server!');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRect = () => {
    const zoneId = prompt('Nhập ID cho zone (VD: VIP_A, ZONE_1):');
    
    if (!zoneId || zoneId.trim() === '') {
      alert('⚠️ ID không được để trống!');
      return;
    }

    const isDuplicate = layout.zones.some(z => z.id === zoneId.trim());
    if (isDuplicate) {
      alert('⚠️ ID này đã tồn tại! Vui lòng chọn ID khác.');
      return;
    }

    const newZone = {
      id: zoneId.trim().toUpperCase(),
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
    const zoneId = prompt('Nhập ID cho zone (VD: SUPERFAN, FANZONE_A):');
    
    if (!zoneId || zoneId.trim() === '') {
      alert('⚠️ ID không được để trống!');
      return;
    }

    const isDuplicate = layout.zones.some(z => z.id === zoneId.trim());
    if (isDuplicate) {
      alert('⚠️ ID này đã tồn tại! Vui lòng chọn ID khác.');
      return;
    }

    const newZone = {
      id: zoneId.trim().toUpperCase(),
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
    if (layout.zones.length === 0) {
      alert('⚠️ Vui lòng tạo ít nhất 1 zone!');
      return;
    }

    console.log('📤 Layout data:', { eventId: id, layout });
    setIsSubmitting(true);

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE}/api/admin/layout/${id}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ layout })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${isEditMode ? 'Cập nhật' : 'Thêm'} layout thành công!`);
        
        if (window.confirm('Bạn có muốn quay về trang chỉnh sửa sự kiện không?')) {
          navigate(`/admin/events/${id}/edit`);
        } else {
          fetchEventAndLayout();
        }
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #002fff 0%, #ff0000 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px 60px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #667eea',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>
            Đang tải dữ liệu...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #002fff 0%, #ff0000 100%)',
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
          marginTop: '40px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '25px 30px',
          color: 'white'
        }}>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '28px', 
            fontWeight: 700 
          }}>
            🎨 {isEditMode ? 'Chỉnh Sửa' : 'Tạo'} Bố Cục Sự Kiện
          </h1>
          <p style={{ 
            margin: 0, 
            opacity: 0.9, 
            fontSize: '14px' 
          }}>
            {eventInfo ? eventInfo.event_name : 'Đang tải...'}
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Event Info Banner */}
          {eventInfo && (
            <div style={{
              marginBottom: '20px',
              padding: '20px',
              background: isEditMode ? '#fff3cd' : '#d1ecf1',
              border: isEditMode ? '2px solid #ffc107' : '2px solid #17a2b8',
              borderRadius: '8px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '18px',
                    color: '#333'
                  }}>
                    📅 {eventInfo.event_name}
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    📍 {eventInfo.event_location} • 
                    🕒 {new Date(eventInfo.event_start).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div style={{
                  padding: '8px 16px',
                  background: isEditMode ? '#ff9800' : '#28a745',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  {isEditMode ? '⚠️ CHỈNH SỬA' : '✨ TẠO MỚI'}
                </div>
              </div>
            </div>
          )}

          {/* Layout Designer */}
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
            justifyContent: 'space-between',
            gap: '15px',
            paddingTop: '20px',
            marginTop: '30px',
            borderTop: '2px solid #e0e0e0'
          }}>
            <button
              onClick={() => navigate(`/admin/events/${id}/edit`)}
              disabled={isSubmitting}
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
              onMouseEnter={(e) => e.target.style.background = '#5a6268'}
              onMouseLeave={(e) => e.target.style.background = '#6c757d'}
            >
              ← Quay lại sự kiện
            </button>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  if (window.confirm('Hủy thay đổi? Mọi thay đổi sẽ không được lưu.')) {
                    fetchEventAndLayout();
                  }
                }}
                disabled={isSubmitting}
                style={{
                  padding: '12px 30px',
                  background: isSubmitting ? '#cccccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onMouseEnter={(e) => !isSubmitting && (e.target.style.background = '#c82333')}
                onMouseLeave={(e) => !isSubmitting && (e.target.style.background = '#dc3545')}
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
                {isSubmitting ? 'Đang lưu...' : isEditMode ? '💾 Cập nhật bố cục' : '✅ Tạo bố cục'}
              </button>
            </div>
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
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}