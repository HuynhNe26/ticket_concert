import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingUser from "../../components/loading/loading";
import "./event.css";

const API_BASE = process.env.REACT_APP_API_URL;

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    useEffect(() => {
        const fetchEventData = async () => {
            try {
                // Lấy thông tin sự kiện
                const resEvent = await fetch(`${API_BASE}/api/events/${id}`);
                const dataEvent = await resEvent.json();
                
                // Lấy thông tin zones để kiểm tra số vé
                const resZones = await fetch(`${API_BASE}/api/zone/${id}`);
                const dataZones = await resZones.json();
                
                if (dataEvent.success) {
                    setEvent(dataEvent.data);
                }
                
                if (dataZones.success) {
                    setZones(dataZones.data);
                }
            } catch (err) {
                console.error("Lỗi:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEventData();
    }, [id]);

    if (loading) return <LoadingUser />;
    if (!event) return <div className="no-event">Sự kiện không tồn tại.</div>;

    // Kiểm tra xem còn vé không
    const checkTicketAvailability = () => {
        if (zones.length === 0) return true;
        
        const totalAvailable = zones.reduce((sum, zone) => {
            return sum + (zone.zone_quantity - zone.sold_quantity);
        }, 0);
        
        return totalAvailable > 0;
    };

    const isTicketAvailable = checkTicketAvailability();

    const formatCurrency = (amount) => 
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    // Kiểm tra mô tả dài hơn 10 dòng
    const descriptionLines = event.event_description ? event.event_description.split('\n') : [];
    const isLongDescription = descriptionLines.length > 10;
    const displayDescription = isDescExpanded || !isLongDescription 
        ? event.event_description 
        : descriptionLines.slice(0, 10).join('\n');


    let buttonText = "Chọn lịch diễn";

    if (!isTicketAvailable) {
        buttonText = "Hết vé";
    } else if (event.event_status === false) {
        buttonText = "Sắp mở bán";
    }

    const now = new Date();
    const eventEnd = new Date(event.event_end);
    const isEnded = eventEnd < now;

    return (
        <div className="event-detail-page">
            <div className="event-container">
                
                <div className="event-ticket-main">
                    <div className="event-ticket-left">
                        <h1 className="event-ticket-title">{event.event_name}</h1>
                        <div className="event-ticket-meta">
                            <div className="event-meta-item">
                                📅 <span>{new Date(event.event_start).toLocaleString('vi-VN')}</span>
                            </div>
                            <div className="event-meta-item">
                                📍 <span>{event.event_location}</span>
                            </div>
                        </div>
                        
                        <div className="event-ticket-footer">
                            <div className="event-price-section">
                                <span className="event-price-label">Giá từ</span>
                                <span className="event-price-value">
                                    {isTicketAvailable 
                                        ? `${formatCurrency(event.min_price || 0)} ›`
                                        : 'Hết vé'
                                    }
                                </span>
                            </div>
                            <button
                            className={`event-btn-buy
                                ${isEnded ? "ended" : ""}
                                ${!isEnded && !isTicketAvailable ? "sold-out" : ""}
                                ${!isEnded && isTicketAvailable && !event.event_status ? "coming-soon" : ""}
                            `}
                            onClick={() =>
                                !isEnded && isTicketAvailable && event.event_status && navigate("booking")
                            }
                            disabled={isEnded || !isTicketAvailable || !event.event_status}
                            >
                            {isEnded
                                ? "Đã kết thúc"
                                : !isTicketAvailable
                                ? "Hết vé"
                                : !event.event_status
                                ? "Sắp mở bán"
                                : "Chọn lịch diễn"}
                            </button>
                        </div>
                    </div>

                    <div className="event-ticket-divider">
                        <div className="event-stub-dot top"></div>
                        <div className="event-stub-line"></div>
                        <div className="event-stub-dot bottom"></div>
                    </div>

                    <div className="event-ticket-right">
                        <img src={event.banner_url} alt={event.event_name} className="event-ticket-banner" />
                        <div className="event-banner-overlay">
                            <div className="event-overlay-dates">
                                <p>Thời gian</p>
                                <h3>{new Date(event.event_start).toLocaleDateString('vi-VN')}</h3>
                                <p>Đến</p>
                                <h3>{new Date(event.event_end).toLocaleDateString('vi-VN')}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PHẦN VÉ VÀ MÔ TẢ --- */}
                <div className="event-content-wrapper">
                    {/* Danh sách vé bên trái */}
                    <div className={`event-tickets-section ${isDescExpanded ? 'expanded' : ''}`}>
                        <h2 className="section-header">Loại vé</h2>
                        <div className="tickets-list">
                            {zones.length > 0 ? (
                                zones.map((zone) => {
                                    const available = zone.zone_quantity - zone.sold_quantity;
                                    const isSoldOut = available <= 0;
                                    
                                    return (
                                        <div key={zone.zone_id} className={`ticket-item ${isSoldOut ? 'sold-out' : ''}`}>
                                            <div className="ticket-info">
                                                <h3 className="ticket-name">{zone.zone_name}</h3>
                                                <p className="ticket-desc">{zone.zone_description}</p>
                                            </div>
                                            <div className="ticket-price-box">
                                                <span className="ticket-price">{formatCurrency(zone.zone_price)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="no-tickets">Chưa có thông tin vé</p>
                            )}
                        </div>
                    </div>

                    {/* Mô tả bên phải */}
                    <div className="event-desc-section">
                        <h2 className="event-desc-header">Giới thiệu</h2>
                        <div className="event-desc-content">
                            <p style={{ whiteSpace: 'pre-line' }}>{displayDescription}</p>
                            
                            {isLongDescription && (
                                <button 
                                    className="btn-toggle-desc"
                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                >
                                    {isDescExpanded ? '▲ Thu gọn' : '▼ Xem thêm'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}