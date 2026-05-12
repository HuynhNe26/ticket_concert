import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, LayoutTemplate, X, Save, Loader2 } from 'lucide-react';
import EventInfoForm from '../add_event/add_event_component/EventInfoForm.jsx';
import LoadingAdmin from '../../../components/loading/loading';
import Warning from '../../../components/notification_admin/warning/warning.jsx';
import Success from '../../../components/notification_admin/success/success.jsx';
import Error from '../../../components/notification_admin/error/error.jsx';
import './event_edit.css';

const API_BASE = process.env.REACT_APP_API_URL;

export default function EditEvent() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [warning, setWarning] = useState({ show: false, message: '' });
  const [success, setSuccess] = useState({ show: false, message: '' });
  const [error,   setError]   = useState({ show: false, message: '' });

  const showWarning = (msg) => setWarning({ show: true, message: msg });
  const showSuccess = (msg) => setSuccess({ show: true, message: msg });
  const showError   = (msg) => setError({ show: true, message: msg });

  const [eventInfo, setEventInfo] = useState({
    name:        '',
    category:    '',
    date:        '',
    time:        '',
    endDate:     '',
    endTime:     '',
    address:     '',
    actor:       '',
    artist:      [],
    age:         '',
    description: '',
    image:       null,
    descImage:   null,
  });

  /* ── Load dữ liệu ── */
  useEffect(() => { loadEventData(); }, [id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const res    = await fetch(`${API_BASE}/api/admin/events/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();

      if (result.success) {
        const event = result.data;

        const parseTime = (iso) => {
          if (!iso) return '';
          const d = new Date(iso);
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        };

        setEventInfo({
          name:        event.event_name        || '',
          category:    event.category_id?.toString() || '',
          date:        event.event_start ? event.event_start.split('T')[0] : '',
          time:        parseTime(event.event_start),
          endDate:     event.event_end   ? event.event_end.split('T')[0]   : '',
          endTime:     parseTime(event.event_end),
          address:     event.event_location    || '',
          actor:       event.event_actor       || '',
          artist:      event.event_artist      || [],
          age:         event.event_age?.toString()   || '',
          description: event.event_description || '',
          image:       event.banner_url        || null,
          descImage:   null,
        });
      } else {
        showError('Không thể tải thông tin sự kiện: ' + result.message);
        navigate('/admin/events');
      }
    } catch {
      showError('Không thể kết nối đến server!');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!eventInfo.name || !eventInfo.date || !eventInfo.address) {
      showWarning('Vui lòng điền đầy đủ thông tin sự kiện!');
      return;
    }
    if (!eventInfo.category) {
      showWarning('Vui lòng chọn thể loại sự kiện!');
      return;
    }
    if (!eventInfo.age) {
      showWarning('Vui lòng nhập độ tuổi tối thiểu!');
      return;
    }
    if (!eventInfo.description?.trim()) {
      showWarning('Vui lòng nhập mô tả sự kiện!');
      return;
    }
    if (!eventInfo.actor) {
      showWarning('Vui lòng nhập đơn vị tổ chức!');
      return;
    }
    if (!eventInfo.artist?.length) {
      showWarning('Vui lòng thêm ít nhất một nghệ sĩ!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res    = await fetch(`${API_BASE}/api/admin/events/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ event: eventInfo, artist: eventInfo.artist }),
      });
      const result = await res.json();

      if (result.success) {
        showSuccess(result.message);
        loadEventData();
      } else {
        showError(result.message);
      }
    } catch {
      showError('Không thể kết nối đến server!');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Render ── */
  if (loading) return <LoadingAdmin />;

  return (
    <>
      <Warning show={warning.show} message={warning.message} onClose={() => setWarning({ show: false, message: '' })} />
      <Success show={success.show} message={success.message} onClose={() => setSuccess({ show: false, message: '' })} />
      <Error   show={error.show}   message={error.message}   onClose={() => setError({ show: false, message: '' })} />

      <div className="ee-wrapper">
        <div className="ee-container">
          {/* ── Card chính ── */}
          <div className="ee-card">
              <EventInfoForm eventInfo={eventInfo} onChange={setEventInfo} />

              {/* Warning note */}
              <div className="ee-warning-box">
                <strong>⚠️ Lưu ý:</strong> Việc thay đổi thông tin sự kiện có thể ảnh hưởng đến vé đã bán và thông tin đã công bố. Vui lòng cân nhắc kỹ trước khi lưu.
              </div>

              {/* Actions */}
              <div className="ee-footer">
                {/* Layout button — bên trái */}
                <div className="ee-footer-left">
                  <button
                    type="button"
                    className="ee-btn ee-btn--primary"
                    disabled={isSubmitting}
                    onClick={() => navigate(`/admin/layout/add/${id}`)}
                  >
                    <LayoutTemplate size={15} />
                    Chỉnh Sửa Layout
                  </button>
                </div>

                {/* Hủy */}
                <button
                  type="button"
                  className="ee-btn ee-btn--ghost"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (window.confirm('Bạn có chắc muốn hủy? Các thay đổi sẽ không được lưu.')) {
                      navigate('/admin/events');
                    }
                  }}
                >
                  <X size={15} />
                  Hủy
                </button>

                {/* Lưu */}
                <button
                  type="button"
                  className="ee-btn ee-btn--primary"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting
                    ? <><Loader2 size={15} className="ee-spin" /> Đang cập nhật...</>
                    : <><Save size={15} /> Lưu Thay Đổi</>
                  }
                </button>
              </div>
          </div>

        </div>
      </div>
    </>
  );
}