import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingUser from "../../components/loading/loading";
import "./event.css";

const API_BASE_URL = "http://localhost:5001";

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/events/${id}`);
                const data = await res.json();
                if (data.success) {
                    setEvent(data.data);
                }
            } catch (err) {
                console.error("Lỗi:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    if (loading) return <LoadingUser />;
    if (!event) return <div className="no-event">Sự kiện không tồn tại.</div>;

    const formatCurrency = (amount) => 
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="event-detail-page"> {/* Thêm class định danh ở đây */}
            <div className="event-container">
                
                {/* --- GIAO DIỆN CHIẾC VÉ --- */}
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
                                <span className="event-price-value">{formatCurrency(event.min_price || 0)} ›</span>
                            </div>
                            <button className="event-btn-buy" onClick={() => navigate(`/booking/${event.event_id}`)}>
                                Chọn lịch diễn
                            </button>
                        </div>
                    </div>

                    {/* Răng cưa giữa vé */}
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

                {/* --- PHẦN GIỚI THIỆU --- */}
                <div className="event-desc-section">
                    <h2 className="event-desc-header">Giới thiệu</h2>
                    <div className="event-desc-content">
                        <p style={{ whiteSpace: 'pre-line' }}>{event.event_description}</p>
                    </div>
                </div>

            </div>
        </div>
    );
}