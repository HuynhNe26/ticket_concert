import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingUser from "../../components/loading/loading";
import "./event.css";

const API_BASE = process.env.REACT_APP_API_URL;

// ─── Helper: lưu event_id vào localStorage (tối đa 10) ───────────────────────
function saveRecentEvent(eventId) {
    const KEY = "recent_event_ids";
    try {
        const raw = localStorage.getItem(KEY);
        const ids = raw ? JSON.parse(raw) : [];

        // Xoá nếu đã tồn tại (để đưa lên đầu)
        const filtered = ids.filter((id) => id !== eventId);

        // Thêm vào đầu, giới hạn 10
        const updated = [eventId, ...filtered].slice(0, 10);

        localStorage.setItem(KEY, JSON.stringify(updated));
    } catch {
        // Bỏ qua lỗi localStorage (private mode, storage full…)
    }
}

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [openZoneId, setOpenZoneId] = useState(null);

    const toggleZone = (id) => {
        setOpenZoneId(openZoneId === id ? null : id);
    };

    useEffect(() => {
        const fetchEventData = async () => {
            try {
                const resEvent = await fetch(`${API_BASE}/api/events/${id}`);
                const dataEvent = await resEvent.json();
            
                const resZones = await fetch(`${API_BASE}/api/zone/${id}`);
                const dataZones = await resZones.json();
                
                if (dataEvent.success) {
                    setEvent(dataEvent.data);
                    // ✅ Lưu event_id vào localStorage khi xem chi tiết
                    saveRecentEvent(id);
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
        new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

    const descriptionLines = event.event_description ? event.event_description.split('\n') : [];
    const isLongDescription = descriptionLines.length > 10;
    const displayDescription = isDescExpanded || !isLongDescription 
        ? event.event_description 
        : descriptionLines.slice(0, 3).join('\n');

    let buttonText = "Hết vé"; 
    
    if (!isTicketAvailable) {
        buttonText = "Hết vé";
    } else if (event.event_status === false) {
        buttonText = "Sắp mở bán";
    }

    const now = new Date();
    const eventStart = new Date(event.event_start)
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
                                <span>📅 {new Date(event.event_start).toLocaleString('vi-VN')}</span>
                            </div>
                            <div className="event-meta-item">
                                <span>📍 {(event.event_location).split(",")[0]}</span> <br />
                                    <span
                                    style={{
                                        display: 'block',
                                        marginLeft: '23px',
                                        color: 'rgb(196,196,207)',
                                        marginTop: '10px'
                                    }}
                                    >
                                    {event.event_location}
                                    </span>
                            </div>
                        </div>
                        
                        <div className="event-ticket-footer">
                            <div className="event-line"></div>
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
                        disabled={isEnded || !isTicketAvailable || eventStart > now}
                        >
                        {isEnded
                            ? "Đã kết thúc"
                            : !isTicketAvailable
                            ? "Hết vé"
                            : eventStart > now
                            ? "Sắp mở bán"
                            : "Chọn khu vực"}
                        </button>
                        </div>
                    </div>
                    <div className="event-stub-line"></div>
                    <div className="event-ticket-divider">
                        <div className="event-stub-dot top"></div>
                        <div className="event-stub-dot bottom"></div>
                    </div>

                    <div className="event-ticket-right">
                        <img src={event.banner_url} alt={event.event_name} className="event-ticket-banner" />
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
                                    const isAlmostOver = available <= 20;

                                        let statusClass = "available";
                                        let statusText = "Còn vé";


                                        if (isSoldOut) {
                                            statusClass = "sold-out";
                                            statusText = "Hết vé";
                                        } else if (isAlmostOver) {
                                            statusClass = "over";
                                            statusText = "Sắp hết vé";
                                        }
                                    
                                    return (
                                        <div 
                                        key={zone.zone_id} 
                                        className={`ticket-item`}
                                        onClick={() => toggleZone(zone.zone_id)}
                                        >
                                            <div className="ticket-info">
                                                <div className="ticket-header">
                                                    <div className="ticket-header-left" style={{flex: 1}}>
                                                        <span className={`arrow ${openZoneId === zone.zone_id ? "open" : ""}`}>
                                                            ▶
                                                        </span>
                                                        <span className="ticket-name">{zone.zone_name}</span>
                                                    </div>

                                                    <div style={{display: 'flex', flexDirection: 'column', marginLeft: '180px'}}>
                                                        <span className="ticket-price">
                                                            {formatCurrency(zone.zone_price)}
                                                        </span>

                                                        <span className={`ticket-status ${statusClass}`}>
                                                            {statusText}
                                                        </span>
                                                    </div>
                                                </div>

                                                {openZoneId === zone.zone_id && (
                                                    <div className="ticket-desc" style={{ whiteSpace: 'pre-line', marginTop: '15px'}}>
                                                        {zone.zone_description}
                                                    </div>
                                                )}
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