import React, { useEffect, useState } from 'react';
import { Clock, Image, Plus, X, ChevronRight } from 'lucide-react';
import FormField from './FormField';
import FormSelect from './FormSelect';
import './EventInfoForm.css';

const API_BASE = process.env.REACT_APP_API_URL;

const EventInfoForm = ({ eventInfo, onChange, onBannerChange }) => {
  const [categories, setCategories] = useState([]);
  const [error, setError]           = useState('');
  const [dragOver, setDragOver]     = useState(false);

  useEffect(() => {
    const getAllCategories = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/admin/categories`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        });
        const data = await res.json();
        if (data.success) {
          setCategories(data.data.map((cat) => ({
            value: cat.category_id,
            label: cat.category_name,
          })));
        }
      } catch (err) {
        setError(err.message);
      }
    };
    getAllCategories();
  }, []);

  const handleChange = (field, value) =>
    onChange({ ...eventInfo, [field]: value });

  const handleArtistChange = (index, value) => {
    const updated = [...(eventInfo.artist || [])];
    updated[index] = { ...updated[index], name: value };
    onChange({ ...eventInfo, artist: updated });
  };

  const addArtist = () =>
    onChange({ ...eventInfo, artist: [...(eventInfo.artist || []), { name: '' }] });

  const removeArtist = (index) =>
    onChange({ ...eventInfo, artist: eventInfo.artist.filter((_, i) => i !== index) });

  const handleFileChange = (file) => {
    if (!file) return;
    onBannerChange(file);
    onChange({ ...eventInfo, image: URL.createObjectURL(file) });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileChange(file);
  };

  return (
    <div className="eif-root">
      {error && <div className="eif-error">⚠ {error}</div>}

      {/* ══ 01 — Thông tin cơ bản ══ */}
      <div className="eif-card">
        <div className="eif-card-header">
          <span className="eif-card-num">01</span>
          <div>
            <div className="eif-card-title">Thông tin cơ bản</div>
            <div className="eif-card-desc">Tên, thể loại và mô tả sự kiện</div>
          </div>
        </div>

        <div className="eif-grid">
          <div className="eif-col-full">
            <FormField
              label="Tên sự kiện *"
              value={eventInfo.name}
              onChange={(v) => handleChange('name', v)}
              placeholder="VD: Anh Trai Say Hi Concert 2025"
            />
          </div>

          <FormSelect
            label="Thể loại *"
            value={eventInfo.category}
            options={categories}
            onChange={(v) => handleChange('category', v)}
          />

          <FormField
            label="Độ tuổi tối thiểu *"
            type="number"
            value={eventInfo.age}
            onChange={(v) => handleChange('age', v)}
            placeholder="0"
          />

          <div className="eif-col-full">
            <FormField
              label="Mô tả sự kiện"
              multiline
              value={eventInfo.description}
              onChange={(v) => handleChange('description', v)}
              placeholder="Mô tả chi tiết về sự kiện..."
            />
          </div>

          <div className="eif-col-full">
            <FormField
              label="Đơn vị tổ chức"
              multiline
              value={eventInfo.actor}
              onChange={(v) => handleChange('actor', v)}
              placeholder="Tên công ty / đơn vị tổ chức..."
            />
          </div>
        </div>
      </div>

      {/* ══ 02 — Thời gian & địa điểm ══ */}
      <div className="eif-card">
        <div className="eif-card-header">
          <span className="eif-card-num">02</span>
          <div>
            <div className="eif-card-title">Thời gian & Địa điểm</div>
            <div className="eif-card-desc">Lịch trình và vị trí diễn ra sự kiện</div>
          </div>
        </div>

        <div className="eif-grid">
          {/* Bắt đầu */}
          <div className="eif-col-full">
            <div className="eif-dt-group">
              <div className="eif-dt-group-label">
                <Clock size={12} /> Bắt đầu
              </div>
              <div className="eif-dt-row">
                <FormField
                  label="Ngày *"
                  type="date"
                  value={eventInfo.date}
                  onChange={(v) => handleChange('date', v)}
                />
                <FormField
                  label="Giờ *"
                  type="time"
                  value={eventInfo.time}
                  onChange={(v) => handleChange('time', v)}
                />
              </div>
            </div>
          </div>

          {/* Kết thúc */}
          <div className="eif-col-full">
            <div className="eif-dt-group">
              <div className="eif-dt-group-label">
                <Clock size={12} /> Kết thúc
              </div>
              <div className="eif-dt-row">
                <FormField
                  label="Ngày *"
                  type="date"
                  value={eventInfo.endDate}
                  onChange={(v) => handleChange('endDate', v)}
                />
                <FormField
                  label="Giờ *"
                  type="time"
                  value={eventInfo.endTime}
                  onChange={(v) => handleChange('endTime', v)}
                />
              </div>
            </div>
          </div>

          <div className="eif-col-full">
            <FormField
              label="Địa chỉ chi tiết *"
              value={eventInfo.address}
              onChange={(v) => handleChange('address', v)}
              placeholder="VD: Sân vận động Mỹ Đình, Hà Nội"
            />
          </div>
        </div>
      </div>

      {/* ══ 03 — Banner ══ */}
      <div className="eif-card">
        <div className="eif-card-header">
          <span className="eif-card-num">03</span>
          <div>
            <div className="eif-card-title">Hình ảnh banner</div>
            <div className="eif-card-desc">Ảnh đại diện hiển thị trên trang sự kiện</div>
          </div>
        </div>

        <label
          className={`eif-upload${dragOver ? ' eif-upload--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            className="eif-upload-input"
            onChange={(e) => handleFileChange(e.target.files[0])}
          />

          {eventInfo.image ? (
            <div className="eif-upload-preview">
              <img src={eventInfo.image} alt="Banner" className="eif-upload-img" />
              <div className="eif-upload-change-overlay">
                <Image size={18} />
                <span>Đổi ảnh</span>
              </div>
            </div>
          ) : (
            <div className="eif-upload-empty">
              <div className="eif-upload-icon-wrap">
                <Image size={30} strokeWidth={1.4} />
              </div>
              <div className="eif-upload-cta">Kéo thả hoặc nhấn để chọn ảnh</div>
              <div className="eif-upload-hint">PNG · JPG · WEBP &nbsp;·&nbsp; Khuyến nghị 1920×1080</div>
            </div>
          )}
        </label>
      </div>

      {/* ══ 04 — Nghệ sĩ ══ */}
      <div className="eif-card">
        <div className="eif-card-header">
          <span className="eif-card-num">04</span>
          <div>
            <div className="eif-card-title">Nghệ sĩ tham gia</div>
            <div className="eif-card-desc">Danh sách nghệ sĩ / diễn giả biểu diễn</div>
          </div>
        </div>

        <div className="eif-artist-list">
          {(eventInfo.artist || []).length === 0 && (
            <div className="eif-artist-empty">Chưa có nghệ sĩ — nhấn nút bên dưới để thêm</div>
          )}
          {(eventInfo.artist || []).map((artist, i) => (
            <div key={i} className="eif-artist-row">
              <span className="eif-artist-idx">{i + 1}</span>
              <div className="eif-artist-field">
                <FormField
                  value={artist.name}
                  placeholder={`Tên nghệ sĩ ${i + 1}`}
                  onChange={(v) => handleArtistChange(i, v)}
                />
              </div>
              <button
                type="button"
                className="eif-artist-del"
                onClick={() => removeArtist(i)}
                title="Xóa"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="eif-artist-add" onClick={addArtist}>
          <Plus size={14} /> Thêm nghệ sĩ
        </button>
      </div>

    </div>
  );
};

export default EventInfoForm;