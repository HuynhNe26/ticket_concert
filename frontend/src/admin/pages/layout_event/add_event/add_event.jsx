import React, { useState } from 'react';
import { Save } from 'lucide-react';

// Import constants
import { DEFAULT_LAYOUT, SHAPE_TYPES } from './add_event_component/constants/index_event.js';

// Import utils
import { generateId } from './add_event_component/utils/index1_event.js';

// Import components
import EventInfoForm from './add_event_component/EventInfoForm.jsx';
import LayoutDesigner from './add_event_component/LayoutDesigner.jsx';

export default function AddEvent() {
  // Event Info State
  const [eventInfo, setEventInfo] = useState({
    name: '',
    category: 'concert',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    venue: '',
    address: '',
    age: '',
    description: '',
    image: null,
    descImage: null
  });

  // Layout State
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#00C7D9');
  const [zoom, setZoom] = useState(1);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    // Validation
    if (!eventInfo.name || !eventInfo.date || !eventInfo.address) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin sự kiện!');
      return;
    }

    if (layout.zones.length === 0) {
      alert('⚠️ Vui lòng tạo ít nhất 1 zone!');
      return;
    }

    // Kiểm tra age
    if (!eventInfo.age || eventInfo.age === '') {
      alert('⚠️ Vui lòng nhập độ tuổi tối thiểu!');
      return;
    }

    // Kiểm tra description
    if (!eventInfo.description || eventInfo.description.trim() === '') {
      alert('⚠️ Vui lòng nhập mô tả sự kiện!');
      return;
    }

    const dataToSend = {
      event: eventInfo,
      layout: layout
    };

    console.log('📤 DỮ LIỆU GỬI LÊN BACKEND:', JSON.stringify(dataToSend, null, 2));

    // Bắt đầu gửi request
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/admin/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ ' + result.message);
        console.log('📥 Kết quả trả về:', result);
        
        // Optional: Reset form sau khi tạo thành công
        if (window.confirm('Sự kiện đã được tạo! Bạn có muốn tạo sự kiện mới?')) {
          window.location.reload();
        } else {
          // Hoặc chuyển về trang danh sách events
          // window.location.href = '/admin/events';
          // hoặc dùng React Router
          // navigate('/admin/events');
        }
      } else {
        alert('❌ ' + result.message);
        console.error('Error response:', result);
      }
    } catch (error) {
      console.error('❌ Lỗi kết nối:', error);
      alert('❌ Không thể kết nối đến server!\n\nVui lòng kiểm tra:\n- Server có đang chạy không?\n- URL API có đúng không?');
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
            ✨ Tạo Sự Kiện Mới
          </h1>
          <p style={{ 
            margin: 0, 
            opacity: 0.9, 
            fontSize: '14px' 
          }}>
            Nhập thông tin sự kiện và thiết kế bố cục sơ đồ chỗ ngồi
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Event Info Form */}
          <EventInfoForm eventInfo={eventInfo} onChange={setEventInfo} />

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
            justifyContent: 'flex-end',
            gap: '15px',
            paddingTop: '20px',
            marginTop: '30px',
            borderTop: '2px solid #e0e0e0'
          }}>
            <button
              onClick={() => {
                if (window.confirm('Hủy tạo sự kiện? Mọi thay đổi sẽ không được lưu.')) {
                  window.location.reload();
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
              {isSubmitting ? 'Đang tạo...' : 'Tạo sự kiện'}
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
              Đang gửi dữ liệu lên server...
            </div>
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