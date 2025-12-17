import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./search.css";

const API_BASE_URL = "http://localhost:5001";

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const queryFromUrl = searchParams.get("q") || "";

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [showLocationFilter, setShowLocationFilter] = useState(false);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [location, setLocation] = useState("Toàn quốc");

    const fetchEvents = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/api/events/search?q=${encodeURIComponent(queryFromUrl)}`;
            if (dateRange.start) url += `&dateStart=${dateRange.start}`;
            if (dateRange.end) url += `&dateEnd=${dateRange.end}`;
            if (location && location !== "Toàn quốc") url += `&location=${encodeURIComponent(location)}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setEvents(data.data);
            }
        } catch (error) {
            console.error("Lỗi tìm kiếm:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [queryFromUrl]); 

    // Handlers
    const handleApplyDate = () => { setShowDateFilter(false); fetchEvents(); };
    const handleApplyLocation = () => { setShowLocationFilter(false); fetchEvents(); };

    const handleResetFilters = () => {
        setDateRange({ start: "", end: "" });
        setLocation("Toàn quốc");
        setShowDateFilter(false);
        setShowLocationFilter(false);
        setTimeout(() => fetchEvents(), 100); 
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="search-page-wrapper">
            {/* Header Filter Section */}
            <div className="search-filter-header">
                <div className="search-container">
                    <div className="search-result-info">
                        <h2>Kết quả cho: <span className="search-highlight">"{queryFromUrl}"</span></h2>
                        <p>{events.length} sự kiện được tìm thấy</p>
                    </div>

                    <div className="search-actions-bar">
                        {/* Date Filter */}
                        <div className="search-filter-group">
                            <button 
                                className={`search-filter-pill ${dateRange.start ? 'active' : ''}`}
                                onClick={() => {setShowDateFilter(!showDateFilter); setShowLocationFilter(false);}}
                            >
                                📅 {dateRange.start ? `${dateRange.start} - ${dateRange.end}` : "Thời gian"}
                            </button>

                            {showDateFilter && (
                                <div className="search-popup">
                                    <h4>Chọn khoảng thời gian</h4>
                                    <div className="search-popup-inputs">
                                        <label>Từ ngày: <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} /></label>
                                        <label>Đến ngày: <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} /></label>
                                    </div>
                                    <div className="search-popup-footer">
                                        <button className="btn-reset" onClick={handleResetFilters}>Đặt lại</button>
                                        <button className="btn-apply" onClick={handleApplyDate}>Áp dụng</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Location Filter */}
                        <div className="search-filter-group">
                            <button 
                                className={`search-filter-pill ${location !== 'Toàn quốc' ? 'active' : ''}`}
                                onClick={() => {setShowLocationFilter(!showLocationFilter); setShowDateFilter(false);}}
                            >
                                📍 {location}
                            </button>

                            {showLocationFilter && (
                                <div className="search-popup">
                                    <h4>Chọn địa điểm</h4>
                                    <div className="search-radio-list">
                                        {["Toàn quốc", "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ"].map(loc => (
                                            <label key={loc} className="search-radio-item">
                                                <input 
                                                    type="radio" 
                                                    name="location" 
                                                    checked={location === loc} 
                                                    onChange={() => setLocation(loc)} 
                                                /> {loc}
                                            </label>
                                        ))}
                                    </div>
                                    <div className="search-popup-footer">
                                        <button className="btn-reset" onClick={handleResetFilters}>Đặt lại</button>
                                        <button className="btn-apply" onClick={handleApplyLocation}>Áp dụng</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Clear Filter Button */}
                        {(dateRange.start || location !== "Toàn quốc") && (
                            <button className="btn-search-clear" onClick={handleResetFilters}>✕ Xóa bộ lọc</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Body */}
            <div className="search-container search-body">
                {loading && <div className="search-loading">Đang tải...</div>}

                {!loading && (
                    <div className="search-grid">
                        {events.length > 0 ? (
                            events.map((event) => (
                                <div className="search-card" key={event.event_id} onClick={() => navigate(`/event/${event.event_id}`)}>
                                    <div className="search-card-img">
                                        <img src={event.banner_url} alt={event.event_name} />
                                        <span className="search-tag-status">Đang bán</span>
                                    </div>
                                    <div className="search-card-content">
                                        <h3 className="search-event-title">{event.event_name}</h3>
                                        <p className="search-event-price">Từ {formatCurrency(event.min_price || 0)}</p>
                                        <p className="search-event-info">
                                            🗓 {new Date(event.event_start).toLocaleDateString('vi-VN')} <br/>
                                            📍 {event.event_location}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="search-no-result">
                                <p>Không tìm thấy sự kiện nào khớp với từ khóa "<strong>{queryFromUrl}</strong>".</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}