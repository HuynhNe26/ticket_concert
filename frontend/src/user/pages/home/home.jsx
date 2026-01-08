import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingUser from "../../components/loading/loading";
import "./home.css"; 

<<<<<<< HEAD
const API_BASE_URL = "https://ticket-concert.onrender.com";
=======
const API_BASE = process.env.REACT_APP_API_URL;
>>>>>>> b319ef262c9c6967589cbd046fffba22610d077f

export default function HomeUser() {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        const getData = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/events`);
                const data = await res.json();
                if (data.success) {
                    setEvents(data.data);
                }
            } catch (err) {
                console.error("Lỗi tải trang chủ:", err);
            } finally {
                setLoading(false);
            }
        };
        getData();
    }, []);

    const formatCurrency = (amount) => 
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const formatDate = (dateString) => 
        new Date(dateString).toLocaleDateString('vi-VN');

    if (loading) return <LoadingUser />;

    // Tách 4 sự kiện đầu làm Xu hướng, còn lại là Dành cho bạn
    const trendingEvents = events.slice(0, 4);
    const forYouEvents = events.slice(4); 

    return (
        <div className="home-wrapper">
            <div className="home-container">
                
                {/* --- PHẦN 1: SỰ KIỆN XU HƯỚNG --- */}
                <section className="section-home">
                    <h2 className="section-title">🔥 Sự kiện xu hướng</h2>
                    <div className="trending-list">
                        {trendingEvents.map((event, index) => (
                            <div key={event.event_id} className="trending-item" onClick={() => navigate(`/event/id=${event.event_id}`)}>
                                {/* Số thứ tự to (1, 2, 3...) */}
                                <span className="trending-number" style={{ WebkitTextStroke: `1px ${index === 0 ? '#00c058' : '#333'}` }}>
                                    {index + 1}
                                </span>
                                <div className="trending-card">
                                    <img src={event.banner_url} alt={event.event_name} />
                                    <div className="trending-info">
                                        <h3>{event.event_name}</h3>
                                        <p className="t-date">{formatDate(event.event_start)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- PHẦN 2: DÀNH CHO BẠN --- */}
                <section className="section-home">
                    <div className="section-header">
                        <h2 className="section-title">Dành cho bạn</h2>
                        <Link to="/search" className="view-more">Xem thêm ›</Link>
                    </div>

                    <div className="event-grid">
                        {/* Nếu không có sự kiện nào khác thì hiển thị lại list cũ để demo cho đẹp */}
                        {(forYouEvents.length > 0 ? forYouEvents : events).map((event) => (
                            <div className="event-card-light" key={event.event_id} onClick={() => navigate(`/event/${event.event_id}`)}>
                                <div className="card-thumb">
                                    <img src={event.banner_url} alt={event.event_name} />
                                    <span className="card-tag">Đang bán</span>
                                </div>
                                <div className="card-body">
                                    <h3 className="card-title">{event.event_name}</h3>
                                    <p className="card-price">Từ {formatCurrency(event.min_price || 0)}</p>
                                    <p className="card-meta">
                                        📅 {formatDate(event.event_start)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}