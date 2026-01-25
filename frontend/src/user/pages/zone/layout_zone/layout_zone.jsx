import React, { useRef, useEffect, useState } from 'react';
import './layout_zone.css';

export default function LayoutZone({ layout, zones }) {
  const canvasRef = useRef(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!layout || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const canvasWidth = layout.canvas?.width || 1200;
    const canvasHeight = layout.canvas?.height || 700;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = layout.canvas?.background || '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const mergedZones = (layout.zones || []).map(layoutZone => {
      const apiZone = zones.find(z => z.zone_code === layoutZone.id);
      
      if (!apiZone) return layoutZone;

      const available = apiZone.zone_quantity - apiZone.sold_quantity;
      const percentLeft = (available / apiZone.zone_quantity) * 100;

      return {
        ...layoutZone,
        zone_quantity: apiZone.zone_quantity,
        sold_quantity: apiZone.sold_quantity,
        available,
        zone_price: apiZone.zone_price,
        displayColor: available === 0 
          ? '#666666' // Hết vé - xám
          : percentLeft < 20 
            ? '#FF9800' // Sắp hết - cam
            : layoutZone.color // Còn nhiều - màu gốc
      };
    });

    mergedZones.forEach(zone => {
      ctx.save();

      if (zone.shape === 'rect') {
        ctx.fillStyle = zone.displayColor || zone.color;
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

        ctx.strokeStyle = zone.available === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

        if (hoveredZone === zone.id) {
          ctx.strokeStyle = '#00FFD4';
          ctx.lineWidth = 3;
          ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        }

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.name, zone.x + zone.width / 2, zone.y + zone.height / 2);

      } else if (zone.shape === 'polygon' && zone.points?.length > 0) {
        ctx.beginPath();
        ctx.moveTo(zone.points[0][0], zone.points[0][1]);
        zone.points.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();

        ctx.fillStyle = zone.displayColor || zone.color;
        ctx.fill();

        ctx.strokeStyle = zone.available === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (hoveredZone === zone.id) {
          ctx.strokeStyle = '#00FFD4';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        const centerX = zone.points.reduce((sum, p) => sum + p[0], 0) / zone.points.length;
        const centerY = zone.points.reduce((sum, p) => sum + p[1], 0) / zone.points.length;

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.name, centerX, centerY);
      }

      ctx.restore();
    });

  }, [layout, zones, hoveredZone]);

  const handleMouseMove = (e) => {
    if (!layout || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x: e.clientX, y: e.clientY });

    const mergedZones = (layout.zones || []).map(layoutZone => {
      const apiZone = zones.find(z => z.zone_code === layoutZone.id);
      return apiZone ? { ...layoutZone, ...apiZone } : layoutZone;
    });

    let found = null;
    for (const zone of mergedZones) {
      if (zone.shape === 'rect') {
        if (x >= zone.x && x <= zone.x + zone.width && 
            y >= zone.y && y <= zone.y + zone.height) {
          found = zone;
          break;
        }
      } else if (zone.shape === 'polygon' && zone.points) {
        let inside = false;
        for (let i = 0, j = zone.points.length - 1; i < zone.points.length; j = i++) {
          const xi = zone.points[i][0], yi = zone.points[i][1];
          const xj = zone.points[j][0], yj = zone.points[j][1];
          const intersect = ((yi > y) !== (yj > y)) && 
                           (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) {
          found = zone;
          break;
        }
      }
    }

    setHoveredZone(found?.id || null);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(price);
  };

  if (!layout) {
    return (
      <div className="layout-loading">
        <div className="spinner"></div>
        <p>Đang tải sơ đồ chỗ...</p>
      </div>
    );
  }

  const hoveredData = zones.find(z => z.zone_code === hoveredZone);

  return (
    <div className="layout-zone-wrapper">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredZone(null)}
        className="layout-canvas"
      />

      {hoveredZone && hoveredData && (
        <div 
          className="zone-tooltip"
          style={{ 
            left: mousePos.x + 15, 
            top: mousePos.y + 15 
          }}
        >
          <div className="tooltip-header">{hoveredData.zone_name}</div>
          <div className="tooltip-price">{formatPrice(hoveredData.zone_price)}</div>
          <div className="tooltip-stock">
          </div>
        </div>
      )}
    </div>
  );
}
