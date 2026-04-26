import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./search.css";

const API_BASE = process.env.REACT_APP_API_URL;

const DAYS_OF_WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const LOCATIONS = ["Toàn quốc", "Hồ Chí Minh", "Hà Nội", "Đà Lạt", "Vị trí khác"];

const saveKeyword = async (eventId, keyword) => {
  try {
    const token = localStorage.getItem("token");
    if (!token || !keyword || !eventId) return;
    await fetch(`${API_BASE}/api/events/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ event_id: eventId, search: keyword }),
    });
  } catch (err) {
    console.error("Lỗi lưu favorite:", err);
  }
};

// ── Helpers ────────────────────────────────────────────────
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfWeek(year, month) { return (new Date(year, month, 1).getDay() + 6) % 7; }
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function getEventStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return { label: "Sắp diễn ra", type: "upcoming" };
  if (now > end)   return { label: "Đã kết thúc",  type: "ended" };
  return { label: "Đang diễn ra", type: "ongoing" };
}

// ── Calendar Component ──────────────────────────────────────
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
    let cls = "cal-day";
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
    <div className="month-calendar">
      <div className="cal-header">
        {showPrev ? <button className="cal-nav" onClick={onPrev}>&#8249;</button> : <span className="cal-nav invisible" />}
        <span className="cal-title">{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
        {showNext ? <button className="cal-nav" onClick={onNext}>&#8250;</button> : <span className="cal-nav invisible" />}
      </div>
      <div className="cal-grid">
        {DAYS_OF_WEEK.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="cal-day empty" />;
          const dayStr = toDateStr(year, month, day);
          return (
            <div key={dayStr} className={getClass(dayStr)} onClick={() => onDayClick(dayStr)} onMouseEnter={() => onDayHover(dayStr)}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Search Page ────────────────────────────────────────
export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryFromUrl = searchParams.get("q") || "";

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dbCategories, setDbCategories] = useState([]);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [quickTab, setQuickTab] = useState("all");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [hoverDate, setHoverDate] = useState("");
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Filter state
  const [showFilter, setShowFilter] = useState(false);
  const [location, setLocation] = useState("Toàn quốc");
  const [genres, setGenres] = useState([]);
  const [tempLocation, setTempLocation] = useState("Toàn quốc");
  const [tempGenres, setTempGenres] = useState([]);

  const dateRef = useRef();
  const filterRef = useRef();

  // Load danh mục từ database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories/all`);
        const result = await res.json();
        if (result.success) setDbCategories(result.data);
      } catch (err) {
        console.error("Lỗi fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Xử lý đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) setShowDatePicker(false);
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchEvents = async (start = selectedStart, end = selectedEnd, loc = location, g = genres) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/events/search?q=${encodeURIComponent(queryFromUrl)}`;
      if (start) url += `&dateStart=${start}`;
      if (end)   url += `&dateEnd=${end}`;
      if (loc && loc !== "Toàn quốc") url += `&location=${encodeURIComponent(loc)}`;
      if (g.length > 0) url += `&genres=${encodeURIComponent(g.join(","))}`; // Gửi danh sách thể loại cách nhau bởi dấu phẩy

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch (err) {
      console.error("Lỗi tìm kiếm:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tự động tải lại khi từ khóa hoặc các bộ lọc thay đổi
  useEffect(() => {
    fetchEvents(selectedStart, selectedEnd, location, genres);
  }, [queryFromUrl, location, genres]); 

  // ── Handlers ──
  const applyQuickTab = (tab) => {
    setQuickTab(tab);
    const t = new Date();
    const fmt = (d) => toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
    let start = "", end = "";

    if (tab === "today") { start = fmt(t); end = fmt(t); }
    else if (tab === "tomorrow") {
      const tm = new Date(t); tm.setDate(t.getDate() + 1);
      start = fmt(tm); end = fmt(tm);
    }
    else if (tab === "weekend") {
      const day = t.getDay();
      const diffSat = (6 - day + 7) % 7 || 7;
      const sat = new Date(t); sat.setDate(t.getDate() + diffSat);
      const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
      start = fmt(sat); end = fmt(sun);
    }
    else if (tab === "thismonth") {
      start = fmt(new Date(t.getFullYear(), t.getMonth(), 1));
      end = fmt(new Date(t.getFullYear(), t.getMonth() + 1, 0));
    }

    setSelectedStart(start);
    setSelectedEnd(end);
    if (tab !== "custom") {
      setShowDatePicker(false);
      fetchEvents(start, end);
    }
  };

  const handleDayClick = (dayStr) => {
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(dayStr); setSelectedEnd(""); setQuickTab("custom");
    } else {
      if (dayStr < selectedStart) { setSelectedEnd(selectedStart); setSelectedStart(dayStr); }
      else { setSelectedEnd(dayStr); }
      setQuickTab("custom");
    }
  };

  const handleApplyDate = () => { 
    setShowDatePicker(false); 
    fetchEvents(selectedStart, selectedEnd); 
  };
  
  const handleResetDate = () => { 
    setSelectedStart(""); 
    setSelectedEnd(""); 
    setQuickTab("all"); 
    setShowDatePicker(false); 
    fetchEvents("", ""); 
  };

  const openFilter = () => { 
    setTempLocation(location); 
    setTempGenres([...genres]); 
    setShowFilter(true); 
    setShowDatePicker(false); 
  };

  const handleApplyFilter = () => { 
    setLocation(tempLocation); 
    setGenres(tempGenres); 
    setShowFilter(false); 
    // fetchEvents sẽ được gọi tự động nhờ useEffect dependency array
  };

  const handleResetFilter = () => { 
    setTempLocation("Toàn quốc"); 
    setTempGenres([]); 
  };

  const toggleGenre = (gName) => { 
    setTempGenres(prev => prev.includes(gName) ? prev.filter(x => x !== gName) : [...prev, gName]); 
  };

  const isDateActive = !!selectedStart;
  const isFilterActive = location !== "Toàn quốc" || genres.length > 0;

  const datePillLabel = () => {
    if (!selectedStart) return "Tất cả các ngày";
    if (selectedEnd && selectedEnd !== selectedStart) return `${formatDate(selectedStart)} – ${formatDate(selectedEnd)}`;
    return formatDate(selectedStart);
  };

  const rightMonth = (calMonth + 1) % 12;
  const rightYear = calMonth === 11 ? calYear + 1 : calYear;

  return (
    <div className="sp-wrapper">
      <div className="sp-filter-bar">
        {/* Date Filter Pill */}
        <div className="sp-pill-wrap" ref={dateRef}>
          <button className={`sp-pill ${isDateActive ? "active" : ""}`} onClick={() => { setShowDatePicker(v => !v); setShowFilter(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {datePillLabel()}
            {isDateActive && <span className="sp-pill-clear" onClick={(e) => { e.stopPropagation(); handleResetDate(); }}>✕</span>}
          </button>

          {showDatePicker && (
            <div className="sp-dropdown sp-date-dropdown">
              <div className="sp-quick-tabs">
                {[{ key: "all", label: "Tất cả" }, { key: "today", label: "Hôm nay" }, { key: "tomorrow", label: "Ngày mai" }, { key: "weekend", label: "Cuối tuần" }, { key: "thismonth", label: "Tháng này" }].map(tab => (
                  <button key={tab.key} className={`sp-qtab ${quickTab === tab.key ? "active" : ""}`} onClick={() => applyQuickTab(tab.key)}>{tab.label}</button>
                ))}
              </div>
              <div className="sp-calendars">
                <MonthCalendar year={calYear} month={calMonth} selectedStart={selectedStart} selectedEnd={selectedEnd} hoverDate={hoverDate} onDayClick={handleDayClick} onDayHover={setHoverDate} showPrev={true} onPrev={() => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1)} />
                <MonthCalendar year={rightYear} month={rightMonth} selectedStart={selectedStart} selectedEnd={selectedEnd} hoverDate={hoverDate} onDayClick={handleDayClick} onDayHover={setHoverDate} showNext={true} onNext={() => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1)} />
              </div>
              <div className="sp-dropdown-footer">
                <button className="sp-btn-ghost" onClick={handleResetDate}>Đặt lại</button>
                <button className="sp-btn-primary" onClick={handleApplyDate} disabled={!selectedStart}>Áp dụng</button>
              </div>
            </div>
          )}
        </div>

        {/* General Filter Pill */}
        <div className="sp-pill-wrap" ref={filterRef}>
          <button className={`sp-pill ${isFilterActive ? "active" : ""}`} onClick={openFilter}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            Bộ lọc {isFilterActive && <span className="sp-pill-badge">{(location !== "Toàn quốc" ? 1 : 0) + genres.length}</span>}
          </button>

          {showFilter && (
            <div className="sp-dropdown sp-filter-dropdown">
              <div className="sp-filter-section">
                <p className="sp-filter-label">Địa điểm</p>
                <div className="sp-chip-group">
                  {LOCATIONS.map(loc => (
                    <button key={loc} className={`sp-chip ${tempLocation === loc ? "active" : ""}`} onClick={() => setTempLocation(loc)}>{loc}</button>
                  ))}
                </div>
              </div>
              <div className="sp-filter-section">
                <p className="sp-filter-label">Thể loại</p>
                <div className="sp-chip-group">
                  {dbCategories.map(cat => (
                    <button 
                      key={cat.category_id} 
                      className={`sp-chip ${tempGenres.includes(cat.category_name) ? "active" : ""}`} 
                      onClick={() => toggleGenre(cat.category_name)}
                    >
                      {cat.category_name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sp-dropdown-footer">
                <button className="sp-btn-ghost" onClick={handleResetFilter}>Đặt lại</button>
                <button className="sp-btn-primary" onClick={handleApplyFilter}>Áp dụng</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count Label */}
      {queryFromUrl && !loading && (
        <p className="sp-result-label">
          {events.length > 0 ? <><strong>{events.length}</strong> kết quả cho "<strong>{queryFromUrl}</strong>"</> : <>Không tìm thấy kết quả cho "<strong>{queryFromUrl}</strong>"</>}
        </p>
      )}

      {/* Body Grid */}
      <div className="sp-body">
        {loading ? (
          <div className="sp-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="sp-card sp-skeleton">
                <div className="sp-card-img skeleton-img" /><div className="sp-card-info"><div className="skeleton-line w80" /><div className="skeleton-line w50" /></div>
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="sp-grid">
            {events.map((event) => {
              const status = getEventStatus(event.event_start, event.event_end);
              return (
                <div key={event.event_id} className="sp-card" onClick={async () => { await saveKeyword(event.event_id, queryFromUrl); navigate(`/event/${event.event_id}`); }}>
                  <div className="sp-card-img">
                    <img src={event.banner_url} alt={event.event_name} />
                    <span className={`sp-status-tag sp-status-${status.type}`}>{status.label}</span>
                  </div>
                  <div className="sp-card-info">
                    <h3 className="sp-event-name">{event.event_name}</h3>
                    <p className="sp-event-date">{new Date(event.event_start).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                    <p className="sp-event-price">Từ <strong>{formatCurrency(event.min_price || 0)}</strong></p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="sp-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p>Không tìm thấy sự kiện nào phù hợp</p>
          </div>
        )}
      </div>
    </div>
  );
}