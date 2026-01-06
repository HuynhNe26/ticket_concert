import React, { useState } from 'react';
import { DEFAULT_LAYOUT } from './add_event_component/constants/index_event.js';
import EventInfoForm from './add_event_component/EventInfoForm.jsx';

const API_BASE = process.env.REACT_APP_API_URL;

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

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!eventInfo.age || eventInfo.age === '') {
      alert('⚠️ Vui lòng nhập độ tuổi tối thiểu!');
      return;
    }

    if (!eventInfo.description || eventInfo.description.trim() === '') {
      alert('⚠️ Vui lòng nhập mô tả sự kiện!');
      return;
    }

    const dataToSend = {
      event: eventInfo,
      layout: layout
    };

    console.log('📤 DỮ LIỆU GỬI LÊN BACKEND:', JSON.stringify(dataToSend, null, 2));

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/admin/events/create`, {
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
        
        if (window.confirm('Sự kiện đã được tạo! Bạn có muốn tạo sự kiện mới?')) {
          window.location.reload();
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
            Nhập thông tin sự kiện
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Event Info Form */}
          <EventInfoForm eventInfo={eventInfo} onChange={setEventInfo} />
        </div>
      </div>
    </div>
  );
}