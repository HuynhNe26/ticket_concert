import React, { useState } from 'react';
import EventInfoForm from './add_event_component/EventInfoForm.jsx';

const API_BASE = process.env.REACT_APP_API_URL;

export default function AddEvent() {
  const [eventInfo, setEventInfo] = useState({
    name: '',
    category: '',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    address: '',
    age: '',
    description: '',
    actor: '',
    image: null,
    descImage: null
  });

  const [artists, setArtists] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleArtistChange = (index, value) => {
    const updatedArtists = [...artists];
    updatedArtists[index] = value;
    setArtists(updatedArtists);
  }

  // Này là hàm xử lý để khi admin nhập vào thì nó lưu thay đổi vào đây!

  const handleSubmit = async () => {
    // Validation
    if (!eventInfo.name || !eventInfo.date || !eventInfo.address) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin sự kiện!');
      return;
    }

    if (!eventInfo.category) {
      alert('⚠️ Vui lòng chọn thể loại sự kiện!');
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

    if (!eventInfo.actor) {
      alert('⚠️ Vui lòng nhập diễn viên chính!');
      return;
    }

    if (!eventInfo.artist) {
      alert('⚠️ Vui lòng nhập nghệ sĩ biểu diễn!');
      return;
    }

    const dataToSend = {
      event: eventInfo
    };

    console.log('📤 DỮ LIỆU GỬI LÊN BACKEND:', JSON.stringify(dataToSend, null, 2));

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/admin/events/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventInfo: dataToSend,
          artist: artists
          // Còn này là sẽ gửi riêng, khi bên backend sẽ nhận toàn bộ data của eventInfo và mảng artists
        })
      });

      // backend chỉ là const { name, ..., arists} = req.body; 
      // thì nó sẽ lấy tất cả dữ liệu như thường và chỉ cần 
      // const query = `
      //   UPDATE events
      //   SET name = $1, 
      //   ...,
      //   artists = $2 (ví dụ)
      // `

      


      const result = await response.json();

      if (result.success) {
        alert('✅ ' + result.message);
        console.log('📥 Kết quả trả về:', result);
        console.log('📋 Event ID:', result.data.event.event_id);
        
        // Hỏi user có muốn thêm layout không
        if (window.confirm('Sự kiện đã được tạo thành công!\n\nBạn có muốn thêm layout và zones cho sự kiện này không?')) {
          // Redirect đến trang add layout với event_id
          const eventId = result.data.event.event_id;
          window.location.href = `/admin/events/${eventId}/add-layout`;
        } else if (window.confirm('Bạn có muốn tạo sự kiện mới?')) {
          window.location.reload();
        } else {
          // Quay về danh sách events
          window.location.href = '/admin/events';
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
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
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
            Nhập thông tin cơ bản về sự kiện. Bạn có thể thêm layout và zones sau.
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Event Info Form */}
          <EventInfoForm eventInfo={eventInfo} onChange={setEventInfo} />

          {/* Info Box */}
          <div style={{
            marginTop: '20px',
            padding: '15px 20px',
            background: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#0066cc'
          }}>
            <strong>💡 Lưu ý:</strong> Sau khi tạo sự kiện, bạn sẽ có thể thêm layout và zones để bắt đầu bán vé.
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'flex-end',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '2px solid #e0e0e0'
          }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
                  window.history.back();
                }
              }}
              disabled={isSubmitting}
              style={{
                padding: '14px 35px',
                fontSize: '15px',
                fontWeight: 600,
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                color: '#666',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                opacity: isSubmitting ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (!isSubmitting) e.target.style.background = '#f5f5f5';
              }}
              onMouseOut={(e) => {
                if (!isSubmitting) e.target.style.background = 'white';
              }}
            >
              ❌ Hủy
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '14px 35px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '8px',
                background: isSubmitting ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: isSubmitting ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => {
                if (!isSubmitting) e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                if (!isSubmitting) e.target.style.transform = 'translateY(0)';
              }}
            >
              {isSubmitting ? '⏳ Đang tạo sự kiện...' : '✅ Tạo Sự Kiện'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}