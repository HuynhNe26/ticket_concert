import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './layout_zone.css';
import LoginPage from "../../login/Loginpage"
import LoadingUser from '../../../components/loading/loading';

const API_BASE = process.env.REACT_APP_API_URL;

export default function LayoutZone({ layout, zones, eventId}) {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const token = localStorage.getItem("token");
  const [selectedZone, setSelectedZone] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);


  useEffect(() => {
    if (!layout || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const canvasWidth = layout.canvas?.width || 1200; const canvasHeight = layout.canvas?.height || 700;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

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

  }, [layout, zones]);


  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(price);
  };

  if (!layout) {
    return (
      <div className="layout-loading">
        <p>Chưa cập nhật!</p>
      </div>
    );
  }

  const handleCanvasClick = (e) => {
    if (!layout || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const mergedZones = (layout.zones || []).map(layoutZone => {
      const apiZone = zones.find(z => z.zone_code === layoutZone.id);
      return apiZone ? { ...layoutZone, ...apiZone } : layoutZone;
    });

    for (const zone of mergedZones) {
      let inside = false;

      if (zone.shape === 'rect') {
        inside =
          x >= zone.x &&
          x <= zone.x + zone.width &&
          y >= zone.y &&
          y <= zone.y + zone.height;
      } 
      else if (zone.shape === 'polygon') {
        for (let i = 0, j = zone.points.length - 1; i < zone.points.length; j = i++) {
          const xi = zone.points[i][0], yi = zone.points[i][1];
          const xj = zone.points[j][0], yj = zone.points[j][1];
          const intersect =
            ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
      }

      if (inside && zone.zone_quantity - zone.sold_quantity > 0) {
        setSelectedZone(zone);
        setQuantity(1);
        setShowOverlay(true);
        break;
      }
    }
  };

  const handleAddToCart = async (eventId, zone_id, quantity) => {
    console.log(eventId, zone_id, quantity)
    if (!eventId || !zone_id || !quantity) {
      alert('Thiếu dữ liệu');
      return
    }

    if (!token) {
      setShowLoginModal(true);
      setShowOverlay(false);
      return
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/cart/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          zone_id: zone_id,
          eventId: eventId,
          quantity: quantity
        })
      })

      const data = await response.json(); // chỉ đọc 1 lần duy nhất

    if (!response.ok) {
      alert(data.message || 'Thêm vào giỏ thất bại');
      return;
    }

    navigate(`/my-cart`);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return <LoadingUser />
  }

  return (
    <div className="layout-zone-wrapper">
      <canvas ref={canvasRef} 
        onClick={handleCanvasClick} 
        className="layout-canvas" 
      />

      {showOverlay && selectedZone && (
        <div className="zone-overlay">
          <div className="zone-modal">
            <h3 style={{textAlign: 'center'}}>{selectedZone.zone_name}</h3>

            <p className="zone-desc">
              {selectedZone.description || 'Chưa cập nhật!'}
            </p>

            <div className="zone-quantity">
              <span>Số lượng:</span>
              <div>
                <button style={{marginRight: '20px'}} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <span style={{marginRight: '20px'}}>{quantity}</span>
                <button
                  disabled={
                    quantity >= 5 ||
                    quantity >= selectedZone.available
                  }
                  onClick={() =>
                    setQuantity(q =>
                      Math.min(
                        5,
                        selectedZone.zone_quantity - selectedZone.sold_quantity,
                        q + 1
                      )
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>
            <span style={{color: 'red', padding: '10px'}}>*Lưu ý: Được mua tối đa 5 ghế</span>

            <div className="zone-actions">
              <button className="btn-cancel" onClick={() => setShowOverlay(false)}>
                Huỷ
              </button>

              <button
                className="btn-confirm"
                onClick={() =>
                  handleAddToCart(eventId, selectedZone.zone_id, quantity)
                }
              >
               Tiếp tục - {formatPrice(quantity * selectedZone.zone_price)} 
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hiển thị LoginPage */}
            {showLoginModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        backdropFilter: 'blur(4px)'
                    }}
                > 
                    <div 
                        style={{
                            position: 'relative',
                            maxWidth: '350px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Nút đóng */}
                        <button
                            onClick={() => setShowLoginModal(false)}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: 'none',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '20px',
                                color: '#666',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>
                        {/* Hiển thị LoginPage */}
                        <LoginPage />
                    </div>
                </div>
            )}
    </div>
    
  );
}