import React from 'react';
import { Copy, Trash2, MapPin } from 'lucide-react';
import { ZONE_TYPES, SHAPE_TYPES } from './constants/index_event';
import FormField from './FormField';
import FormSelect from './FormSelect';

const actionButtonStyle = {
  padding: '6px 10px',
  background: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  fontSize: '12px'
};

const ZoneEditor = ({ zone, onUpdate, onDelete, onDuplicate }) => {
  if (!zone) {
    return (
      <div style={{
        padding: '20px',
        color: '#999',
        textAlign: 'center',
        fontSize: '13px'
      }}>
        <MapPin size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
        <p>Chọn một zone để chỉnh sửa</p>
      </div>
    );
  }

  const handleChange = (field, value) => {
    onUpdate({ ...zone, [field]: value });
  };

  return (
    <div style={{
        
      padding: '15px',
      background: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h4 style={{ margin: 0, fontSize: '15px', color: '#333' }}>
          Chỉnh sửa Zone
        </h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onDuplicate} style={actionButtonStyle} title="Nhân bản">
            <Copy size={14} />
          </button>
          <button onClick={onDelete} style={{...actionButtonStyle, background: '#dc3545'}} title="Xóa">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <FormField label="ID" value={zone.id} onChange={(v) => handleChange('ID', v)} placeholder="" />
        <FormField 
          label="Tên Zone" 
          value={zone.name}
          onChange={(v) => handleChange('name', v)}
          placeholder="VD: VIP A, FANZONE..."
        />
        <FormSelect
          label="Loại"
          value={zone.type}
          options={ZONE_TYPES}
          onChange={(v) => handleChange('type', v)}
        />
        <FormField 
          label="Màu" 
          type="color"
          value={zone.color}
          onChange={(v) => handleChange('color', v)}
        />

        {zone.shape === SHAPE_TYPES.RECT && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FormField 
                label="X" 
                type="number"
                value={zone.x}
                onChange={(v) => handleChange('x', Number(v))}
              />
              <FormField 
                label="Y" 
                type="number"
                value={zone.y}
                onChange={(v) => handleChange('y', Number(v))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FormField 
                label="Rộng" 
                type="number"
                value={zone.width}
                onChange={(v) => handleChange('width', Number(v))}
              />
              <FormField 
                label="Cao" 
                type="number"
                value={zone.height}
                onChange={(v) => handleChange('height', Number(v))}
              />
            </div>
          </>
        )}

        {zone.price !== undefined && (
          <FormField 
            label="Giá vé (VNĐ)" 
            type="number"
            value={zone.price}
            onChange={(v) => handleChange('price', Number(v))}
          />
        )}

        {zone.total_quantity !== undefined && (
          <FormField 
            label="Số lượng" 
            type="number"
            value={zone.total_quantity}
            onChange={(v) => handleChange('total_quantity', Number(v))}
          />
        )}

        <FormField 
          label="Mô tả" 
          value={zone.description || ''}
          onChange={(v) => handleChange('description', v)}
          placeholder="Mô tả zone..."
          multiline
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px',
          background: 'white',
          borderRadius: '6px'
        }}>
        </div>
      </div>
    </div>
  );
};

export default ZoneEditor;