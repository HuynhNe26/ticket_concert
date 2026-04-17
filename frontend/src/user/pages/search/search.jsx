import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./search.css";

const API_BASE = process.env.REACT_APP_API_URL;

const DAYS_OF_WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const LOCATIONS = ["Toàn quốc", "Hồ Chí Minh", "Hà Nội", "Đà Lạt", "Vị trí khác"];
const GENRES = ["Nhạc sống", "Sân khấu & Nghệ thuật", "Thể Thao", "Hội thảo & Workshop", "Tham quan & Trải nghiệm", "Khác"];

const saveKeyword = async (eventId, keyword) => {
    console.log(keyword)
    try {
        const token = localStorage.getItem("token");
        if (!token || !keyword || !eventId) return;

        await fetch(`${API_BASE}/api/events/favorite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                event_id: eventId,
                search: keyword
            }),
        });
    } catch (err) {
        console.error("Lỗi lưu favorite:", err);
    }
};

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
    const d = new Date(year, month, 1).getDay();
    return (d + 6) % 7;
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
}

function toDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function MonthCalendar({ year, month, selectedStart, selectedEnd, hoverDate, onDayClick, onDayHover, showPrev, showNext, onPrev, onNext }) {
    const today = new Date();
    const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const firstDow = getFirstDayOfWeek(year, month);
    const daysInMonth = getDaysInMonth(year, month);

    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const monthName = new Date(year, month, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

    const getClass = (dayStr) => {
        let cls = "calendar-day";
        if (dayStr === todayStr) cls += " today";
        if (selectedStart && selectedEnd) {
            if (dayStr === selectedStart && dayStr === selectedEnd) cls += " selected";
            else if (dayStr === selectedStart) cls += " range-start selected";
            else if (dayStr === selectedEnd) cls += " range-end selected";
            else if (dayStr > selectedStart && dayStr < selectedEnd) cls += " in-range";
        } else if (selectedStart && !selectedEnd) {
            if (dayStr === selectedStart) cls += " selected";
            else if (hoverDate && dayStr > selectedStart && dayStr <= hoverDate) cls += " in-range";
        }
        return cls;
    };

    return (
        <div className="date-calendar">
            <div className="calendar-header">
                {showPrev ? (
                    <button className="cal-nav-btn" onClick={onPrev}>&#8249;</button>
                ) : <span className="cal-nav-btn hidden">&#8249;</span>}
                <h3>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h3>
                {showNext ? (
                    <button className="cal-nav-btn" onClick={onNext}>&#8250;</button>
                ) : <span className="cal-nav-btn hidden">&#8250;</span>}
            </div>
            <div className="calendar-grid">
                {DAYS_OF_WEEK.map(d => (
                    <div key={d} className="calendar-dow">{d}</div>
                ))}
                {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} className="calendar-day empty" />;
                    const dayStr = toDateStr(year, month, day);
                    return (
                        <div
                            key={dayStr}
                            className={getClass(dayStr)}
                            onClick={() => onDayClick(dayStr)}
                            onMouseEnter={() => onDayHover(dayStr)}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryFromUrl = searchParams.get("q") || "";

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [quickTab, setQuickTab] = useState("all"); 
    const [selectedStart, setSelectedStart] = useState("");
    const [selectedEnd, setSelectedEnd] = useState("");
    const [hoverDate, setHoverDate] = useState("");
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth());

    const [showFilter, setShowFilter] = useState(false);
    const [location, setLocation] = useState("Toàn quốc");
    const [freeOnly, setFreeOnly] = useState(false);
    const [genres, setGenres] = useState([]);

    const [tempLocation, setTempLocation] = useState("Toàn quốc");
    const [tempFreeOnly, setTempFreeOnly] = useState(false);
    const [tempGenres, setTempGenres] = useState([]);

    const dateRef = useRef();
    const filterRef = useRef();

    useEffect(() => {
        const handler = (e) => {
            if (dateRef.current && !dateRef.current.contains(e.target)) setShowDatePicker(false);
            if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchEvents = async (start = selectedStart, end = selectedEnd, loc = location, free = freeOnly, g = genres) => {
        setLoading(true);
        try {
            let url = `${API_BASE}/api/events/search?q=${encodeURIComponent(queryFromUrl)}`;
            if (start) url += `&dateStart=${start}`;
            if (end)   url += `&dateEnd=${end}`;
            if (loc && loc !== "Toàn quốc") url += `&location=${encodeURIComponent(loc)}`;
            if (free) url += `&free=true`;
            if (g.length) url += `&genres=${encodeURIComponent(g.join(","))}`;

            const res = await fetch(url);
            const data = await res.json();
            if (data.success) setEvents(data.data);
            console.log(events)
        } catch (err) {
            console.error("Lỗi tìm kiếm:", err);
        } finally {
            setLoading(false);
        }
    };

    const lastKeywordRef = useRef("");
    useEffect(() => {
        if (queryFromUrl && lastKeywordRef.current !== queryFromUrl) {
            lastKeywordRef.current = queryFromUrl;
            fetchEvents();
        }
    }, [queryFromUrl]);

    const applyQuickTab = (tab) => {
        setQuickTab(tab);
        const t = new Date();
        const fmt = (d) => toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
        if (tab === "all") { setSelectedStart(""); setSelectedEnd(""); }
        else if (tab === "today") { setSelectedStart(fmt(t)); setSelectedEnd(fmt(t)); }
        else if (tab === "tomorrow") {
            const tm = new Date(t); tm.setDate(t.getDate() + 1);
            setSelectedStart(fmt(tm)); setSelectedEnd(fmt(tm));
        } else if (tab === "weekend") {
            const day = t.getDay();
            const diffSat = (6 - day + 7) % 7 || 7;
            const sat = new Date(t); sat.setDate(t.getDate() + diffSat);
            const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
            setSelectedStart(fmt(sat)); setSelectedEnd(fmt(sun));
        } else if (tab === "thismonth") {
            const first = new Date(t.getFullYear(), t.getMonth(), 1);
            const last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
            setSelectedStart(fmt(first)); setSelectedEnd(fmt(last));
        }
    };

    const handleDayClick = (dayStr) => {
        if (!selectedStart || (selectedStart && selectedEnd)) {
            setSelectedStart(dayStr);
            setSelectedEnd("");
            setQuickTab("custom");
        } else {
            if (dayStr < selectedStart) {
                setSelectedEnd(selectedStart);
                setSelectedStart(dayStr);
            } else {
                setSelectedEnd(dayStr);
            }
            setQuickTab("custom");
        }
    };

    const handleApplyDate = () => {
        setShowDatePicker(false);
        fetchEvents(selectedStart, selectedEnd);
    };

    const handleResetDate = () => {
        setSelectedStart(""); setSelectedEnd(""); setQuickTab("all");
        setShowDatePicker(false);
        fetchEvents("", "");
    };

    const openFilter = () => {
        setTempLocation(location);
        setTempFreeOnly(freeOnly);
        setTempGenres([...genres]);
        setShowFilter(true);
        setShowDatePicker(false);
    };

    const handleApplyFilter = () => {
        setLocation(tempLocation);
        setFreeOnly(tempFreeOnly);
        setGenres(tempGenres);
        setShowFilter(false);
        fetchEvents(selectedStart, selectedEnd, tempLocation, tempFreeOnly, tempGenres);
    };

    const handleResetFilter = () => {
        setTempLocation("Toàn quốc");
        setTempFreeOnly(false);
        setTempGenres([]);
    };

    const toggleGenre = (g) => {
        setTempGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
    };

    const isDateActive = !!(selectedStart);
    const isFilterActive = location !== "Toàn quốc" || freeOnly || genres.length > 0;

    const datePillLabel = () => {
        if (!selectedStart) return "Tất cả các ngày";
        if (selectedEnd && selectedEnd !== selectedStart) return `${formatDate(selectedStart)} - ${formatDate(selectedEnd)}`;
        return formatDate(selectedStart);
    };

    const filterPillLabel = "Bộ lọc";

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

    const rightMonth = (calMonth + 1) % 12;
    const rightYear = calMonth === 11 ? calYear + 1 : calYear;

    return (
        <div className="search-page-wrapper">
            <div className="search-container search-body">
                {loading && <div className="search-loading">Đang tải</div>}

                {!loading && (
                    <div className="search-grid">
                        {events.length > 0 ? (
                            events.map((event) => (
                                <div
                                    className="search-card"
                                    key={event.event_id}
                                    onClick={async () => {
                                        await saveKeyword(event.event_id, queryFromUrl);
                                        navigate(`/event/${event.event_id}`);
                                    }}
                                >
                                    <div className="search-card-img">
                                        <img src={event.banner_url} alt={event.event_name} />
                                        <span className="search-tag-status">Đã diễn ra</span>
                                    </div>
                                    <div className="search-card-content">
                                        <h3 className="search-event-title">{event.event_name}</h3>
                                        <p className="search-event-price">Từ {formatCurrency(event.min_price || 0)}</p>
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