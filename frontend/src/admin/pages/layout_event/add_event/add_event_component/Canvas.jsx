import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { SHAPE_TYPES, HANDLE_SIZE } from './constants/index_event';
import { isPointInRect, isPointInPolygon, getPolygonBounds } from './utils/index1_event';

const zoomButtonStyle = {
  padding: '6px 10px',
  background: '#f0f0f0',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center'
};

const Canvas = ({ layout, selectedZone, onSelectZone, onUpdateZone, zoom, onZoomIn, onZoomOut }) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);
  const [currentCursor, setCurrentCursor] = useState('grab');

  const getResizeHandle = (x, y, zone) => {
    if (!zone || zone.shape !== SHAPE_TYPES.RECT) return null;
    
    const handleSize = HANDLE_SIZE / zoom;
    const { x: zx, y: zy, width, height } = zone;
    
    // Check corners first (priority)
    if (Math.abs(x - zx) < handleSize && Math.abs(y - zy) < handleSize) return 'nw';
    if (Math.abs(x - (zx + width)) < handleSize && Math.abs(y - zy) < handleSize) return 'ne';
    if (Math.abs(x - zx) < handleSize && Math.abs(y - (zy + height)) < handleSize) return 'sw';
    if (Math.abs(x - (zx + width)) < handleSize && Math.abs(y - (zy + height)) < handleSize) return 'se';
    
    // Check edges
    if (Math.abs(x - zx) < handleSize && y >= zy && y <= zy + height) return 'w';
    if (Math.abs(x - (zx + width)) < handleSize && y >= zy && y <= zy + height) return 'e';
    if (Math.abs(y - zy) < handleSize && x >= zx && x <= zx + width) return 'n';
    if (Math.abs(y - (zy + height)) < handleSize && x >= zx && x <= zx + width) return 's';
    
    return null;
  };

  const getCursorForHandle = (handle) => {
    const cursors = {
      'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize',
      'n': 'n-resize', 's': 's-resize', 'e': 'e-resize', 'w': 'w-resize'
    };
    return cursors[handle] || 'grab';
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicking on a resize handle of selected zone
    if (selectedZone && selectedZone.shape === SHAPE_TYPES.RECT) {
      const handle = getResizeHandle(x, y, selectedZone);
      if (handle) {
        setResizeHandle(handle);
        setIsDragging(true);
        setCurrentCursor(getCursorForHandle(handle));
        return;
      }
    }

    const clickedZone = layout.zones.slice().reverse().find(zone => {
      if (zone.shape === SHAPE_TYPES.RECT) {
        return isPointInRect(x, y, zone.x, zone.y, zone.width, zone.height);
      } else if (zone.shape === SHAPE_TYPES.POLYGON) {
        return isPointInPolygon(x, y, zone.points);
      }
      return false;
    });

    if (clickedZone) {
      onSelectZone(clickedZone);
      setIsDragging(true);
      setResizeHandle(null);
      setCurrentCursor('grabbing');
      
      if (clickedZone.shape === SHAPE_TYPES.RECT) {
        setDragOffset({ x: x - clickedZone.x, y: y - clickedZone.y });
      } else if (clickedZone.shape === SHAPE_TYPES.POLYGON) {
        const bounds = getPolygonBounds(clickedZone.points);
        setDragOffset({ x: x - bounds.minX, y: y - bounds.minY });
      }
    } else {
      onSelectZone(null);
      setResizeHandle(null);
      setCurrentCursor('grab');
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Update cursor when hovering over resize handles
    if (!isDragging && selectedZone && selectedZone.shape === SHAPE_TYPES.RECT) {
      const handle = getResizeHandle(x, y, selectedZone);
      setCurrentCursor(handle ? getCursorForHandle(handle) : 'grab');
    }

    if (!isDragging || !selectedZone) return;

    if (resizeHandle && selectedZone.shape === SHAPE_TYPES.RECT) {
      // Resizing
      const { x: zx, y: zy, width, height } = selectedZone;
      let newX = zx, newY = zy, newWidth = width, newHeight = height;

      switch(resizeHandle) {
        case 'nw':
          newX = x;
          newY = y;
          newWidth = width + (zx - x);
          newHeight = height + (zy - y);
          break;
        case 'ne':
          newY = y;
          newWidth = x - zx;
          newHeight = height + (zy - y);
          break;
        case 'sw':
          newX = x;
          newWidth = width + (zx - x);
          newHeight = y - zy;
          break;
        case 'se':
          newWidth = x - zx;
          newHeight = y - zy;
          break;
        case 'n':
          newY = y;
          newHeight = height + (zy - y);
          break;
        case 's':
          newHeight = y - zy;
          break;
        case 'w':
          newX = x;
          newWidth = width + (zx - x);
          break;
        case 'e':
          newWidth = x - zx;
          break;
      }

      // Minimum size constraint
      if (newWidth < 30) newWidth = 30;
      if (newHeight < 30) newHeight = 30;

      onUpdateZone({
        ...selectedZone,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    } else if (!resizeHandle) {
      // Moving
      if (selectedZone.shape === SHAPE_TYPES.RECT) {
        onUpdateZone({
          ...selectedZone,
          x: x - dragOffset.x,
          y: y - dragOffset.y
        });
      } else if (selectedZone.shape === SHAPE_TYPES.POLYGON) {
        const bounds = getPolygonBounds(selectedZone.points);
        const dx = (x - dragOffset.x) - bounds.minX;
        const dy = (y - dragOffset.y) - bounds.minY;
        
        onUpdateZone({
          ...selectedZone,
          points: selectedZone.points.map(p => [p[0] + dx, p[1] + dy])
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizeHandle(null);
    setCurrentCursor('grab');
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      onZoomIn();
    } else {
      onZoomOut();
    }
  };

  const drawZone = (ctx, zone, isSelected) => {
    ctx.save();
    
    if (zone.shape === SHAPE_TYPES.RECT) {
      ctx.fillStyle = zone.color;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([10 / zoom, 5 / zoom]);
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        
        // Draw resize handles
        const handleSize = HANDLE_SIZE / zoom;
        const handles = [
          { x: zone.x, y: zone.y }, // nw
          { x: zone.x + zone.width, y: zone.y }, // ne
          { x: zone.x, y: zone.y + zone.height }, // sw
          { x: zone.x + zone.width, y: zone.y + zone.height }, // se
          { x: zone.x + zone.width / 2, y: zone.y }, // n
          { x: zone.x + zone.width / 2, y: zone.y + zone.height }, // s
          { x: zone.x, y: zone.y + zone.height / 2 }, // w
          { x: zone.x + zone.width, y: zone.y + zone.height / 2 } // e
        ];
        
        ctx.setLineDash([]);
        handles.forEach(handle => {
          ctx.fillStyle = '#FFD700';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1 / zoom;
          ctx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      }
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${14 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, zone.x + zone.width / 2, zone.y + zone.height / 2);
      
    } else if (zone.shape === SHAPE_TYPES.POLYGON && zone.points?.length > 0) {
      ctx.beginPath();
      ctx.moveTo(zone.points[0][0], zone.points[0][1]);
      zone.points.forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      
      ctx.fillStyle = zone.color;
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([10 / zoom, 5 / zoom]);
        ctx.stroke();
        
        // Draw vertex handles for polygon
        const handleSize = HANDLE_SIZE / zoom;
        ctx.setLineDash([]);
        zone.points.forEach(point => {
          ctx.fillStyle = '#FFD700';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1 / zoom;
          ctx.beginPath();
          ctx.arc(point[0], point[1], handleSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      }
      
      const bounds = getPolygonBounds(zone.points);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${14 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, centerX, centerY);
    }
    
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = layout.canvas.width * dpr;
    canvas.height = layout.canvas.height * dpr;
    canvas.style.width = `${layout.canvas.width}px`;
    canvas.style.height = `${layout.canvas.height}px`;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, layout.canvas.width, layout.canvas.height);
    
    ctx.save();
    ctx.scale(zoom, zoom);
    
    ctx.fillStyle = layout.canvas.background;
    ctx.fillRect(0, 0, layout.canvas.width, layout.canvas.height);
    ctx.save();
    ctx.restore();
    
    layout.zones.forEach(zone => {
      drawZone(ctx, zone, selectedZone?.id === zone.id);
    });
    
    ctx.restore();
  }, [layout, selectedZone, zoom]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{ fontSize: '13px', color: '#666' }}>
          Tổng zones: <strong>{layout.zones.length}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onZoomOut} style={zoomButtonStyle}>
            <ZoomOut size={16} />
          </button>
          <span style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 600 }}>
            {(zoom * 100).toFixed(0)}%
          </span>
          <button onClick={onZoomIn} style={zoomButtonStyle}>
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: currentCursor,
          display: 'block',
          boxShadow: '0 0 20px rgba(0,0,0,0.3)',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

export default Canvas;