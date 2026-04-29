import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, RotateCcw, ArrowLeft, ChevronRight, LayoutTemplate, Loader2 } from 'lucide-react';
import { SHAPE_TYPES, DEFAULT_LAYOUT } from '../add_event/add_event_component/constants/index_event.js';
import { generateId } from '../add_event/add_event_component/utils/index1_event.js';
import LayoutDesigner from '../add_event/add_event_component/LayoutDesigner.jsx';
import Warning from '../../../components/notification_admin/warning/warning.jsx';
import Success from '../../../components/notification_admin/success/success.jsx';
import Error from '../../../components/notification_admin/error/error.jsx';
import './add_layout.css';

const API_BASE = process.env.REACT_APP_API_URL;

export default function AddLayout() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [eventInfo,    setEventInfo]    = useState(null);
  const [layout,       setLayout]       = useState(DEFAULT_LAYOUT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedColor,setSelectedColor]= useState('#00C7D9');
  const [zoom,         setZoom]         = useState(1);
  const [isEditMode,   setIsEditMode]   = useState(false);

  const [warning, setWarning] = useState({ show: false, message: '' });
  const [success, setSuccess] = useState({ show: false, message: '' });
  const [error,   setError]   = useState({ show: false, message: '' });

  const showWarning = (msg) => setWarning({ show: true, message: msg });
  const showSuccess = (msg) => setSuccess({ show: true, message: msg });
  const showError   = (msg) => setError({ show: true, message: msg });

  useEffect(() => {
    if (id) {
      fetchEventAndLayout();
    } else {
      showWarning('Thiếu ID sự kiện!');
      navigate('/admin/events');
    }
  }, [id]);

  /* ── Fetch ── */
  const fetchEventAndLayout = async () => {
    try {
      setLoading(true);

      const eventRes    = await fetch(`${API_BASE}/api/admin/events/${id}`);
      const eventResult = await eventRes.json();

      if (eventResult.success) {
        setEventInfo(eventResult.data);
      } else {
        showWarning('Không tìm thấy sự kiện!');
        navigate('/admin/events');
        return;
      }

      try {
        const layoutRes    = await fetch(`${API_BASE}/api/admin/layout/${id}`);
        const layoutResult = await layoutRes.json();

        if (layoutResult.success && layoutResult.data.layout) {
          setLayout(layoutResult.data.layout.layout_json);
          setIsEditMode(true);
        } else {
          setLayout(DEFAULT_LAYOUT);
          setIsEditMode(false);
        }
      } catch {
        setLayout(DEFAULT_LAYOUT);
        setIsEditMode(false);
      }
    } catch {
      showError('Lỗi hệ thống');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  /* ── Zone handlers ── */
  const handleAddRect = () => {
    const zoneId = prompt('Nhập ID cho zone (VD: VIP_A, ZONE_1):');
    if (!zoneId?.trim()) { showWarning('ID không được để trống!'); return; }
    if (layout.zones.some((z) => z.id === zoneId.trim())) {
      showWarning('ID này đã tồn tại! Vui lòng chọn ID khác.');
      return;
    }
    const newZone = {
      id: zoneId.trim().toUpperCase(),
      name: `ZONE_${layout.zones.length + 1}`,
      type: 'Ngồi',
      shape: SHAPE_TYPES.RECT,
      x: 100, y: 100, width: 150, height: 100,
      color: selectedColor,
      price: 500000, total_quantity: 100, status: true, description: '',
    };
    setLayout({ ...layout, zones: [...layout.zones, newZone] });
    setSelectedZone(newZone);
  };

  const handleAddPolygon = () => {
    const zoneId = prompt('Nhập ID cho zone (VD: SUPERFAN, FANZONE_A):');
    if (!zoneId?.trim()) { showWarning('ID không được để trống!'); return; }
    if (layout.zones.some((z) => z.id === zoneId.trim())) {
      showWarning('ID này đã tồn tại! Vui lòng chọn ID khác.');
      return;
    }
    const newZone = {
      id: zoneId.trim().toUpperCase(),
      name: `POLYGON_${layout.zones.length + 1}`,
      type: 'Đứng',
      shape: SHAPE_TYPES.POLYGON,
      points: [[200,200],[300,200],[350,280],[250,320],[150,280]],
      color: selectedColor,
      price: 800000, total_quantity: 200, status: true, description: '',
    };
    setLayout({ ...layout, zones: [...layout.zones, newZone] });
    setSelectedZone(newZone);
  };

  const handleUpdateZone = (updated) => {
    setLayout({ ...layout, zones: layout.zones.map((z) => (z.id === updated.id ? updated : z)) });
    setSelectedZone(updated);
  };

  const handleDeleteZone = () => {
    if (!selectedZone) return;
    if (window.confirm(`Xóa zone "${selectedZone.name}"?`)) {
      setLayout({ ...layout, zones: layout.zones.filter((z) => z.id !== selectedZone.id) });
      setSelectedZone(null);
    }
  };

  const handleDuplicateZone = () => {
    if (!selectedZone) return;
    const dup = {
      ...selectedZone,
      id:     generateId(),
      name:   `${selectedZone.name}_COPY`,
      x:      selectedZone.x      ? selectedZone.x + 20      : undefined,
      y:      selectedZone.y      ? selectedZone.y + 20      : undefined,
      points: selectedZone.points ? selectedZone.points.map((p) => [p[0]+20, p[1]+20]) : undefined,
    };
    setLayout({ ...layout, zones: [...layout.zones, dup] });
    setSelectedZone(dup);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (layout.zones.length === 0) {
      showWarning('Vui lòng tạo ít nhất 1 zone!');
      return;
    }
    setIsSubmitting(true);
    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const res    = await fetch(`${API_BASE}/api/admin/layout/${id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });
      const result = await res.json();
      if (result.success) {
        showSuccess(`${isEditMode ? 'Cập nhật' : 'Tạo'} bố cục thành công!`);
        fetchEventAndLayout();
      } else {
        showError(result.message);
      }
    } catch {
      showError('Không thể kết nối đến server!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZoomIn  = () => setZoom((p) => Math.min(p + 0.1, 3));
  const handleZoomOut = () => setZoom((p) => Math.max(p - 0.1, 0.3));

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="al-loading">
        <div className="al-loading-card">
          <div className="al-spinner" />
          <p className="al-loading-text">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <>
      <Warning show={warning.show} message={warning.message} onClose={() => setWarning({ show: false, message: '' })} />
      <Success show={success.show} message={success.message} onClose={() => setSuccess({ show: false, message: '' })} />
      <Error   show={error.show}   message={error.message}   onClose={() => setError({ show: false, message: '' })} />

      <div className="al-wrapper">
        <div className="al-container">

          {/* ── Page header ── */}
          <div className="al-page-header">
            <div className="al-breadcrumb">
              <span>Sự kiện</span>
              <ChevronRight size={13} />
              <span>Chỉnh sửa</span>
              <ChevronRight size={13} />
              <span className="al-breadcrumb-active">Bố cục</span>
            </div>
          </div>

          {/* ── Event info banner ── */}
          {eventInfo && (
            <div className="al-event-banner">
              <div className="al-event-banner-info">
                <p className="al-event-name">📅 {eventInfo.event_name}</p>
                <p className="al-event-meta">
                  📍 {eventInfo.event_location}
                  <span className="al-event-meta-dot">•</span>
                  🕒 {new Date(eventInfo.event_start).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <span className={`al-badge ${isEditMode ? 'al-badge--edit' : 'al-badge--new'}`}>
                {isEditMode ? '✏️ Chỉnh sửa' : '✨ Tạo mới'}
              </span>
            </div>
          )}

          {/* ── Layout designer card ── */}
          <div className="al-card">
            <div className="al-card-body">
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

              {/* Footer actions */}
              <div className="al-footer">
                {/* Quay lại — bên trái */}
                <button
                  className="al-btn al-btn--ghost"
                  disabled={isSubmitting}
                  onClick={() => navigate(`/admin/events/edit/${id}`)}
                >
                  <ArrowLeft size={15} />
                  Quay lại sự kiện
                </button>

                {/* Hủy + Lưu — bên phải */}
                <div className="al-footer-right">
                  <button
                    className="al-btn al-btn--danger"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (window.confirm('Hủy thay đổi? Mọi thay đổi sẽ không được lưu.')) {
                        fetchEventAndLayout();
                      }
                    }}
                  >
                    <RotateCcw size={15} />
                    Hủy bỏ
                  </button>

                  <button
                    className="al-btn al-btn--primary"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <><Loader2 size={15} className="al-spin-icon" /> Đang lưu...</>
                    ) : (
                      <><Save size={15} /> {isEditMode ? 'Cập nhật bố cục' : 'Tạo bố cục'}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Submitting bar */}
              {isSubmitting && (
                <div className="al-submitting-bar">
                  <div className="al-spinner" />
                  Đang lưu bố cục, vui lòng chờ...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}