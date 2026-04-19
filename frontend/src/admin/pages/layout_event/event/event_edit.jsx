import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EventInfoForm from '../add_event/add_event_component/EventInfoForm.jsx';
import LoadingAdmin from '../../../components/loading/loading';
import Warning from '../../../components/notification_admin/warning/warning.jsx';
import Success from '../../../components/notification_admin/success/success.jsx';
import Error from '../../../components/notification_admin/error/error.jsx';

const API_BASE = process.env.REACT_APP_API_URL;

export default function EditEvent() {
  const { id } = useParams(); // Lấy eventId từ URL
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState({ show: false, message: '' });
  const [success, setSuccess] = useState({ show: false, message: '' });
  const [error, setError] = useState({show: false, message: '' });
  const showWarning = (message) => setWarning({ show: true, message });
  const showSuccess = (message) => setSuccess({ show: true, message });
  const showError =  (message) => setError({ show: true, message });
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
    image: null,
    descImage: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load dữ liệu sự kiện khi component mount
  useEffect(() => {
    loadEventData();
  }, [id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin/events/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        const event = result.data;
        
        // Parse time từ ISO string (HH:MM format)
        const parseTime = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        };
        
        // Map dữ liệu từ backend vào form - FIELD NAMES ĐÚNG
        setEventInfo({
          name: event.event_name || '',
          category: event.category_id?.toString() || '', // Backend trả về category_id
          date: event.event_start ? event.event_start.split('T')[0] : '',
          time: parseTime(event.event_start),
          endDate: event.event_end ? event.event_end.split('T')[0] : '',
          endTime: parseTime(event.event_end),
          address: event.event_location || '',
          actor: event.event_actor || '',
          artist: event.event_artist || [],
          age: event.event_age?.toString() || '', // Backend trả về event_age
          description: event.event_description || '', // Backend trả về event_description
          image: event.banner_url || null,
          descImage: null
        });
      } else {
        showError('Không thể tải thông tin sự kiện: ' + result.message);
        navigate('/admin/events');
      }
    } catch (error) {
      showError('Không thể kết nối đến server!');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!eventInfo.name || !eventInfo.date || !eventInfo.address) {
      showWarning('Vui lòng điền đầy đủ thông tin sự kiện!');
      return;
    }

    if (!eventInfo.category) {
      showWarning('Vui lòng chọn thể loại sự kiện!');
      return;
    }

    if (!eventInfo.age || eventInfo.age === '') {
      showWarning('Vui lòng nhập độ tuổi tối thiểu!');
      return;
    }

    if (!eventInfo.description || eventInfo.description.trim() === '') {
      showWarning('Vui lòng nhập mô tả sự kiện!');
      return;
    }

     if (!eventInfo.actor) {
      showWarning('Vui lòng nhập diễn viên chính!');
      return;
    }

    if (!eventInfo.artist) {
      showWarning('Vui lòng nhập nghệ sĩ biểu diễn!');
      return;
    }

    const dataToSend = {
      event: eventInfo,
      artist: eventInfo.artist
    };

    console.log('📤 DỮ LIỆU CẬP NHẬT:', JSON.stringify(dataToSend, null, 2));

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/admin/events/${id}`, {
        method: 'PUT', // Dùng PUT để update
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(result.message);
        loadEventData();
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError('Không thể kết nối đến server!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hiển thị loading khi đang tải dữ liệu
  if (loading) {
    return <LoadingAdmin />;
  }

  return (
     <>
          <Warning show={warning.show} message={warning.message} onClose={() => setWarning({ show: false, message: '' })} />
          <Success show={success.show} message={success.message} onClose={() => setSuccess({ show: false, message: '' })} />
          <Error show={error.show} message={error.message} onClose={() => setError({ show: false, message: '' })} />
    <div style={{
      marginTop: '50px',
      minHeight: '100vh',
      background: 'white',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'linear-gradient(180deg, #ff0000 0%, #0059ff 100%)',
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
            ✏️ Chỉnh Sửa Sự Kiện
          </h1>
          <p style={{ 
            margin: 0, 
            opacity: 0.9, 
            fontSize: '14px' 
          }}>
            Cập nhật thông tin sự kiện. Các thay đổi sẽ được lưu ngay lập tức.
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Event Info Form */}
          <EventInfoForm eventInfo={eventInfo} onChange={setEventInfo} />

          {/* Info Box */}
          <div style={{
            marginTop: '20px',
            padding: '15px 20px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#856404'
          }}>
            <strong>⚠️ Lưu ý:</strong> Việc thay đổi thông tin sự kiện có thể ảnh hưởng đến vé đã bán và thông tin đã công bố. Vui lòng cân nhắc kỹ trước khi lưu.
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
              onClick={() => {navigate(`/admin/layout/add/${id}`);}}
              disabled={isSubmitting}
              style={{
                marginRight: 'auto',
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
              🎨 Chỉnh Sửa Layout
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn hủy? Các thay đổi sẽ không được lưu.')) {
                  navigate('/admin/events');
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
              {isSubmitting ? '⏳ Đang cập nhật...' : '💾 Lưu Thay Đổi'}
            </button>
             
          </div>
        </div>
      </div>
    </div>
    </>
  );
}