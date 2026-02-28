import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import FormField from './FormField';
import FormSelect from './FormSelect';

const API_BASE = process.env.REACT_APP_API_URL;

const EventInfoForm = ({ eventInfo, onChange, onBannerChange }) => {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const getAllCategories = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/admin/categories`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' }
        });

        const data = await response.json();
        if (data.success) {
          setCategories(
            data.data.map(cat => ({
              value: cat.category_id,
              label: cat.category_name
            }))
          );
        }
      } catch (err) {
        setError(err.message);
      }
    };

    getAllCategories();
  }, []);

  const handleChange = (field, value) => {
    onChange({ ...eventInfo, [field]: value });
  };

  // ===== ARTIST HANDLERS =====
  const handleArtistChange = (index, value) => {
    const updatedArtists = [...(eventInfo.artist || [])];
    updatedArtists[index] = { ...updatedArtists[index], name: value };
    onChange({ ...eventInfo, artist: updatedArtists });
  };

  const addArtist = () => {
    const updatedArtists = [...(eventInfo.artist || [])];
    updatedArtists.push({ name: "" });
    onChange({ ...eventInfo, artist: updatedArtists });
  };

  const removeArtist = (index) => {
    const updatedArtists = eventInfo.artist.filter((_, i) => i !== index);
    onChange({ ...eventInfo, artist: updatedArtists });
  };

  return (
    <div style={{
      marginBottom: '30px',
      padding: '25px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Calendar size={24} />
        Thông tin sự kiện
      </h2>

      {error && <div style={{ color: 'red' }}>Lỗi: {error}</div>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px'
      }}>
        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Tên sự kiện *"
            value={eventInfo.name}
            onChange={(v) => handleChange('name', v)}
          />
        </div>

        <FormSelect
          label="Thể loại *"
          value={eventInfo.category}
          options={categories}
          onChange={(v) => handleChange('category', v)}
        />

        <FormField
          label="Ngày diễn ra *"
          type="date"
          value={eventInfo.date}
          onChange={(v) => handleChange('date', v)}
        />

        <FormField
          label="Thời gian *"
          type="time"
          value={eventInfo.time}
          onChange={(v) => handleChange('time', v)}
        />

        <FormField
          label="Ngày kết thúc *"
          type="date"
          value={eventInfo.endDate}
          onChange={(v) => handleChange('endDate', v)}
        />

        <FormField
          label="Thời gian kết thúc *"
          type="time"
          value={eventInfo.endTime}
          onChange={(v) => handleChange('endTime', v)}
        />

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Địa chỉ chi tiết *"
            value={eventInfo.address}
            onChange={(v) => handleChange('address', v)}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Độ tuổi *"
            type="number"
            value={eventInfo.age}
            onChange={(v) => handleChange('age', v)}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Mô tả sự kiện"
            multiline
            value={eventInfo.description}
            onChange={(v) => handleChange('description', v)}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Đơn vị tổ chức"
            multiline
            value={eventInfo.actor}
            onChange={(v) => handleChange('actor', v)}
          />
        </div>
                {/* ===== BANNER UPLOAD ===== */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            🖼 Banner sự kiện *
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;

              // gửi file lên component cha
              onBannerChange(file);

              // preview tạm thời
              onChange({
                ...eventInfo,
                image: URL.createObjectURL(file)
              });
            }}
          />

          {eventInfo.image && (
            <img
              src={eventInfo.image}
              alt="Banner preview"
              style={{
                marginTop: '12px',
                maxWidth: '100%',
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}
            />
          )}
        </div>

        {/* ===== ARTIST SECTION ===== */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontWeight: 600 }}>🎤 Nghệ sĩ tham gia</label>

          {(eventInfo.artist || []).map((artist, index) => (
            <div
              key={index}
              style={{ display: 'flex', gap: '10px', marginTop: '10px' }}
            >
              <FormField
                value={artist.name}
                placeholder={`Nghệ sĩ ${index + 1}`}
                onChange={(v) => handleArtistChange(index, v)}
              />
              

              <button
                type="button"
                onClick={() => removeArtist(index)}
                style={{
                  background: '#ff4d4f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0 12px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addArtist}
            style={{
              marginTop: '10px',
              padding: '8px 14px',
              border: '1px dashed #667eea',
              borderRadius: '6px',
              background: '#f0f3ff',
              cursor: 'pointer'
            }}
          >
            + Thêm nghệ sĩ
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventInfoForm;
