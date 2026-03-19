import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingUser from "../../components/loading/loading";
import "./home.css"; 

const API_BASE = process.env.REACT_APP_API_URL;

export default function HomeUser() {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const [trending, setTrendings] = useState([]);
    const [eventMonth, setEventMonths] = useState([]);
    const [categories, setCategories] = useState([]);
    const [eventCategory, setEventCategory] = useState([])
    const [showLoginModal, setShowLoginModal] = useState(false); // State hiển thị modal
    const navigate = useNavigate();

    const today = new Date();
    const month = today.getMonth() + 1; // tháng (0-11 nên phải +1)
    const year = today.getFullYear();

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

        const getTopTrending = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/events/top-trending?month=${month}&year=${year}`);

                const data = await res.json();
                if (data.success) {
                    setTrendings(data.data)
                }
            } catch (err) {
                console.error("Lỗi tải trang chủ:", err);
            } finally {
                setLoading(false)
            }
        }

        const getEventInMonth = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/events/event-month?month=${month}&year=${year}`);

                const data = await res.json();
                if (data.success) {
                    setEventMonths(data.data)
                }
            } catch (err) {
                console.error("Lỗi tải trang chủ:", err);
            } finally {
                setLoading(false)
            }
        }

        const getCategories = async() => {
            try {
                const res = await fetch(`${API_BASE}/api/categories/`);

                const data = await res.json();
                if (data.success) {
                    setCategories(data.data)
                }
            } catch (err) {
                console.error("Lỗi tải trang chủ:", err);
            } finally {
                setLoading(false);
            }
        }

        const getEventInCategory = async () => {
            const id = categories[0]?.category_id;
            if (!id) {
                alert("Lỗi lấy id category");
            }

            try {
                const res = await fetch(`${API_BASE}/api/events/category/${id}`);

                const data = await res.json();
                if (data.success) {
                    setEventCategory(data.data)
                }
            } catch (err) {
                console.error("Lỗi tải trang chủ:", err);
            } finally {
                setLoading(false);
            }
        }

        getData();
        getTopTrending();
        getEventInMonth();
        getCategories();
    }, []);

    const formatCurrency = (amount) => 
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const formatDate = (dateString) => 
        new Date(dateString).toLocaleDateString('vi-VN');

    if (loading) return <LoadingUser />;

    const trendingEvents = events.slice(0, 4);
    const forYouEvents = events.slice(12); 

    return (
        <div className="home-wrapper">
            <div className="home-container">
                {/* --- PHẦN 1: SỰ KIỆN XU HƯỚNG --- */}
                <section className="section-trending">
                    <h2 className="section-title">🔥 Sự kiện xu hướng</h2>
                    <div className="trending-list">
                        {trending.map((event, index) => (
                            <div key={event.event_id} className="trending-item" onClick={() => navigate(`/event/${event.event_id}`)}>
                                <span className="trending-number" style={{ WebkitTextStroke: `1px ${index === 0 ? '#00c058' : '#333'}` }}>
                                    {index + 1}
                                </span>
                                <img className="trending-card" src={event.banner_url} alt={event.event_name} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- PHẦN 2: THEO THÁNG --- */}
                <section className="section-home">
                    <div className="section-header">
                        <h2 className="section-title" style={{color: 'white'}}>Sự kiện tháng {month}</h2>
                        <Link to="/search" className="view-more">Xem thêm ›</Link>
                    </div>

                    <div className="event-grid">
                        {eventMonth.map((event) => (
                            <div className="event-card-light" key={event.event_id} onClick={() => navigate(`/event/${event.event_id}`)}>
                                <div className="card-thumb">
                                    <img src={event.banner_url} alt={event.event_name} />
                                </div>
                                <div className="card-body">
                                    <span className="card-title">{event.event_name}</span>
                                    <span className="card-price">Từ {formatCurrency(event.min_price || 0)}</span>
                                    <span className="card-meta">
                                        📅 {formatDate(event.event_start)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- PHẦN 3: DÀNH CHO BẠN --- */}
                <section className="section-home">
                    <div className="section-header">
                        <h2 className="section-title" >Dành cho bạn</h2>
                        <Link to="/search" className="view-more">Xem thêm ›</Link>
                    </div>

                    <div className="event-grid">
                        {(forYouEvents.length > 0 ? forYouEvents : events).map((event) => (
                            <div className="event-card-light" key={event.event_id} onClick={() => navigate(`/event/${event.event_id}`)}>
                                <div className="card-thumb">
                                    <img src={event.banner_url} alt={event.event_name} />
                                </div>
                                <div className="card-body">
                                    <span className="card-title">{event.event_name}</span>
                                    <span className="card-price">Từ {formatCurrency(event.min_price || 0)}</span>
                                    <span className="card-meta">
                                        📅 {formatDate(event.event_start)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

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
                    onClick={() => setShowLoginModal(false)}
                >
                    <div 
                        style={{
                            background: '#2a2d3a',
                            borderRadius: '16px',
                            maxWidth: '450px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >         
                    </div>
                </div>
            )}
        </div>
    );
}