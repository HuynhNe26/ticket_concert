import React from 'react';
import { MapPin } from 'lucide-react';
import LayoutToolbar from './LayoutToolbar';
import Canvas from './Canvas';
import ZoneEditor from './ZoneEditor';

const LayoutDesigner = ({
  layout,
  selectedZone,
  onSelectZone,
  onUpdateZone,
  onDeleteZone,
  onDuplicateZone,
  selectedColor,
  onColorChange,
  onAddRect,
  onAddPolygon,
  zoom,
  onZoomIn,
  onZoomOut
}) => {
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
        <MapPin size={24} style={{ color: '#667eea' }} />
        Thiết kế bố cục sơ đồ chỗ
      </h2>

      <LayoutToolbar
        onAddRect={onAddRect}
        onAddPolygon={onAddPolygon}
        selectedColor={selectedColor}
        onColorChange={onColorChange}
      />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '15px'
      }}>
        <Canvas
          layout={layout}
          selectedZone={selectedZone}
          onSelectZone={onSelectZone}
          onUpdateZone={onUpdateZone}
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />

        <ZoneEditor
          zone={selectedZone}
          onUpdate={onUpdateZone}
          onDelete={onDeleteZone}
          onDuplicate={onDuplicateZone}
        />
      </div>
    </div>
  );
};

export default LayoutDesigner;