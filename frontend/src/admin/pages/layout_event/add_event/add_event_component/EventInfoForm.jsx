import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import FormField from './FormField';
import FormSelect from './FormSelect';

const API_BASE = process.env.REACT_APP_API_URL;

const EventInfoForm = ({ eventInfo, onChange }) => {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const getAllCategories = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/admin/categories`, {
          method: 'GET',
          headers: {
            'content-type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.success) {
          const formattedCategories = data.data.map(cat => ({
            value: cat.category_id,
            label: cat.category_name
          }));
          setCategories(formattedCategories);
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
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Calendar size={24} style={{ color: '#667eea' }} />
        Thông tin sự kiện
      </h2>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Lỗi: {error}
        </div>
      )}

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
            placeholder="VD: Anh Trai Say Hi 2025"
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
            placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Độ tuổi (xét độ tuổi này trở lên) *"
            type="number"
            value={eventInfo.age}
            onChange={(v) => handleChange('age', v)}
            placeholder="18"
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Mô tả sự kiện"
            value={eventInfo.description}
            onChange={(v) => handleChange('description', v)}
            placeholder="Giới thiệu về sự kiện, nghệ sĩ tham gia..."
            multiline
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Mô tả sự kiện"
            value={eventInfo.description}
            onChange={(v) => handleChange('description', v)}
            placeholder="Giới thiệu về sự kiện, nghệ sĩ tham gia..."
            multiline
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Đơn vị tổ chức"
            value={eventInfo.actor}
            onChange={(v) => handleChange('actor', v)}
            placeholder="Giới thiệu về đơn vị tổ chức"
            multiline
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <FormField
            label="Tên nghệ sĩ"
            value={eventInfo.artist}
            onChange={(v) => handleChange('artist', v)}
            placeholder="Tên nghệ sĩ trình diễn"
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#555'
          }}>
            📷 Ảnh bìa sự kiện
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleChange('image', e.target.files[0])}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px dashed #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          />
          {eventInfo.image && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              background: '#e7f3ff',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#0066cc'
            }}>
              ✓ Đã chọn: {eventInfo.image.name}
            </div>
          )}
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#555'
          }}>
            📷 Ảnh mô tả sự kiện
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleChange('descImage', e.target.files[0])}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px dashed #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          />
          {eventInfo.descImage && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              background: '#e7f3ff',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#0066cc'
            }}>
              ✓ Đã chọn: {eventInfo.descImage.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventInfoForm;