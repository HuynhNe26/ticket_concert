import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Info, Loader2, X, CheckCircle2 } from 'lucide-react';
import EventInfoForm from './add_event_component/EventInfoForm.jsx';
import './add_event.css';

const API_BASE = process.env.REACT_APP_API_URL;

export default function AddEvent() {
  const [eventInfo, setEventInfo] = useState({
    name: '', category: '', date: '', time: '',
    endDate: '', endTime: '', address: '',
    age: '', description: '', actor: '',
  });

  const [bannerFile,   setBannerFile]   = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const checks = [
      [!eventInfo.name || !eventInfo.date || !eventInfo.address, 'Vui lòng điền đầy đủ thông tin sự kiện!'],
      [!eventInfo.category,                                       'Vui lòng chọn thể loại sự kiện!'],
      [!eventInfo.age,                                            'Vui lòng nhập độ tuổi tối thiểu!'],
      [!eventInfo.description?.trim(),                            'Vui lòng nhập mô tả sự kiện!'],
      [!eventInfo.actor,                                          'Vui lòng nhập đơn vị tổ chức!'],
      [!eventInfo.artist?.length,                                 'Vui lòng thêm ít nhất một nghệ sĩ!'],
      [!bannerFile,                                               'Vui lòng tải lên banner sự kiện!'],
    ];

    for (const [cond, msg] of checks) {
      if (cond) { alert('⚠️ ' + msg); return; }
    }

    const formData = new FormData();
    formData.append('event', JSON.stringify(eventInfo));
    formData.append('banner', bannerFile);

    setIsSubmitting(true);
    try {
      const res    = await fetch(`${API_BASE}/api/admin/events/create`, { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        window.location.href = `/admin/layout/add/${result.data.event.event_id}`;
      } else {
        alert('❌ ' + result.message);
      }
    } catch (err) {
      alert('❌ Lỗi kết nối server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
      window.history.back();
    }
  };

  return (
    <div className="ae-root">

      {/* ── Top bar ── */}
      <div className="ae-topbar">
        <button className="ae-back-btn" onClick={handleCancel}>
          <ArrowLeft size={16} />
          Quay lại
        </button>

        <div className="ae-topbar-right">
          <div className="ae-step-pill">Bước 1 / 2</div>
        </div>
      </div>

      {/* ── Content wrapper ── */}
      <div className="ae-content">

        {/* ── Sticky action footer (desktop) ── */}
        <div className="ae-sidebar">
          <div className="ae-sidebar-card">
            <div className="ae-sidebar-title">
              <Sparkles size={15} />
              Tạo sự kiện mới
            </div>
            <p className="ae-sidebar-desc">
              Hoàn tất thông tin cơ bản. Bạn sẽ thêm layout &amp; zones ở bước tiếp theo.
            </p>

            <div className="ae-sidebar-info">
              <Info size={13} />
              <span>Các trường có dấu <b>*</b> là bắt buộc</span>
            </div>

            <div className="ae-sidebar-actions">
              <button
                className="ae-btn-cancel"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X size={15} />
                Hủy
              </button>

              <button
                className="ae-btn-submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <><Loader2 size={15} className="ae-spin" /> Đang tạo…</>
                  : <><CheckCircle2 size={15} /> Tạo sự kiện</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="ae-form-col">
          <EventInfoForm
            eventInfo={eventInfo}
            onChange={setEventInfo}
            onBannerChange={setBannerFile}
          />

          {/* ── Mobile action bar ── */}
          <div className="ae-mobile-bar">
            <button
              className="ae-btn-cancel"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <X size={15} /> Hủy
            </button>
            <button
              className="ae-btn-submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <><Loader2 size={15} className="ae-spin" /> Đang tạo…</>
                : <><CheckCircle2 size={15} /> Tạo sự kiện</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}