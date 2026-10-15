import { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./header.css";
import LoginPage from "../../pages/login/Loginpage";
import Success from "../notification/success/success";

const API_BASE = process.env.REACT_APP_API_URL;

export default function Header() {
  const [user, setUser] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isClosingMobileSearch, setIsClosingMobileSearch] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  // Search history dropdown & live search
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchWrapperRef = useRef(null);
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const storedUser = JSON.parse(localStorage.getItem("user"));
        setUser(storedUser || decoded);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setKeyword(params.get("q") || "");
  }, [location.search]);

  // Live search debounce when keyword changes
  useEffect(() => {
    if (!keyword.trim()) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE}/api/events/search?q=${encodeURIComponent(keyword.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setLiveResults(data.data.slice(0, 6));
        } else {
          setLiveResults([]);
        }
      } catch (err) {
        console.error("Live search error:", err);
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".user-menu-wrapper")) {
        setShowUserMenu(false);
      }
      // Close search history if clicked outside search wrapper
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll on mobile when search overlay is open
  useEffect(() => {
    if (showMobileSearch) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showMobileSearch]);

  const handleOpenMobileSearch = () => {
    setIsClosingMobileSearch(false);
    setShowMobileSearch(true);
    setTimeout(() => {
      mobileInputRef.current?.focus();
    }, 180);
  };

  const handleCloseMobileSearch = () => {
    if (isClosingMobileSearch) return;
    setIsClosingMobileSearch(true);
    setTimeout(() => {
      setShowMobileSearch(false);
      setIsClosingMobileSearch(false);
      setShowHistory(false);
    }, 240);
  };

  // Load history from localStorage
  const loadHistory = () => {
    try {
      const data = localStorage.getItem("historySearch");
      const parsed = data ? JSON.parse(data) : [];
      setHistorySearch(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
    } catch {
      setHistorySearch([]);
    }
  };

  const handleInputFocus = () => {
    loadHistory();
    setShowHistory(true);
  };

  const handleDeleteHistory = (e, item) => {
    e.stopPropagation();
    const updated = historySearch.filter((h) => h !== item);
    setHistorySearch(updated);
    localStorage.setItem("historySearch", JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    setHistorySearch([]);
    localStorage.removeItem("historySearch");
  };

  const handleHistoryClick = (item) => {
    setKeyword(item);
    setShowHistory(false);
    navigate(`/search?q=${encodeURIComponent(item)}`);
  };

  const saveToHistory = (kw) => {
    if (!kw || !kw.trim()) return;
    const cleanKw = kw.trim();
    if (!token) {
      let history = [];
      try {
        const data = localStorage.getItem("historySearch");
        const parsed = data ? JSON.parse(data) : [];
        history = Array.isArray(parsed) ? parsed : [];
      } catch {
        history = [];
      }
      history = history.filter((item) => item !== cleanKw);
      history.unshift(cleanKw);
      history = history.slice(0, 4);
      localStorage.setItem("historySearch", JSON.stringify(history));
    }
  };

  const saveAndSearch = (kw) => {
    if (!kw || !kw.trim()) return;
    saveToHistory(kw);
    setShowHistory(false);
    navigate(`/search?q=${encodeURIComponent(kw.trim())}`);
  };

  const handleSelectEvent = (event) => {
    saveToHistory(event.event_name);
    setShowMobileSearch(false);
    setShowHistory(false);
    navigate(`/event/${event.event_id}`);
  };

  const formatPrice = (price) => {
    if (!price) return "Đang cập nhật";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const renderSuggestionsOrHistory = (isMobile = false) => {
    const hasKeyword = keyword.trim().length > 0;

    if (hasKeyword) {
      return (
        <div className={isMobile ? "tb-mobile-history tb-suggestions-container" : "tb-history-dropdown tb-suggestions-container"}>
          <div className="tb-history-header">
            <span className="tb-history-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              {isSearching ? "Đang tìm kiếm..." : `Gợi ý sự kiện cho "${keyword}"`}
            </span>
            {liveResults.length > 0 && (
              <span className="tb-suggestion-count">{liveResults.length} sự kiện</span>
            )}
          </div>

          {isSearching ? (
            <div className="tb-suggestion-loading">
              <span className="tb-search-spinner" />
              <span>Đang tìm sự kiện phù hợp...</span>
            </div>
          ) : liveResults.length > 0 ? (
            <div className="tb-suggestion-list">
              {liveResults.map((event) => (
                <div
                  key={event.event_id}
                  className="tb-suggestion-item"
                  onClick={() => handleSelectEvent(event)}
                >
                  <img
                    src={event.banner_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80&fit=crop"}
                    alt={event.event_name}
                    className="tb-suggestion-thumb"
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80&fit=crop"; }}
                  />
                  <div className="tb-suggestion-info">
                    <div className="tb-suggestion-title">{event.event_name}</div>
                    <div className="tb-suggestion-meta">
                      {event.event_start && <span>📅 {formatShortDate(event.event_start)}</span>}
                      {event.event_location && <span className="tb-suggestion-loc">📍 {event.event_location.split(',')[0]}</span>}
                      {event.min_price ? (
                        <span className="tb-suggestion-price">Từ {formatPrice(event.min_price)}</span>
                      ) : null}
                    </div>
                  </div>
                  <span className="tb-suggestion-arrow">›</span>
                </div>
              ))}
              <div
                className="tb-suggestion-footer"
                onClick={() => {
                  saveAndSearch(keyword);
                  if (isMobile) setShowMobileSearch(false);
                }}
              >
                <span>Xem tất cả kết quả cho <strong>"{keyword}"</strong></span>
                <span className="tb-suggestion-arrow">→</span>
              </div>
            </div>
          ) : (
            <div className="tb-suggestion-empty">
              <span>Không tìm thấy sự kiện nào khớp với "{keyword}"</span>
            </div>
          )}
        </div>
      );
    }

    if (showHistory && historySearch.length > 0) {
      return (
        <div className={isMobile ? "tb-mobile-history" : "tb-history-dropdown"}>
          <div className="tb-history-header">
            <span className="tb-history-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Tìm kiếm gần đây
            </span>
            <button className="tb-history-clear-all" onClick={handleClearAllHistory}>
              Xóa tất cả
            </button>
          </div>
          <ul className="tb-history-list">
            {historySearch.map((item, idx) => (
              <li
                key={idx}
                className="tb-history-item"
                onClick={() => {
                  handleHistoryClick(item);
                  if (isMobile) setShowMobileSearch(false);
                }}
              >
                <svg className="tb-history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <span className="tb-history-text">{item}</span>
                <button
                  className="tb-history-delete"
                  onClick={(e) => handleDeleteHistory(e, item)}
                  title="Xóa"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return null;
  };

  const handleSearch = () => saveAndSearch(keyword);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") {
      setShowMobileSearch(false);
      setShowHistory(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      if (token) {
        await fetch(`${API_BASE}/api/users/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        setShowLogoutSuccess(true);
        window.location.reload();
      }
    } catch (err) {
      console.log("Logout error", err);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("tokenExpire");
    setUser(null);
    setShowUserMenu(false);
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "M");

  return (
    <>
      <Success
        show={showLogoutSuccess}
        message="Đăng xuất thành công!"
        onClose={() => setShowLogoutSuccess(false)}
      />

      <header className="tb-header">
        <div className="tb-container">
          {/* Logo */}
          <Link to="/" className="tb-logo">
            <img
              src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776499227/xmcn7vabeqm6lgnvl0pm.png"
              alt="Logo"
            />
          </Link>

          {/* Desktop Search + History Dropdown */}
          <div className="tb-search-wrapper" ref={searchWrapperRef}>
            <div className={`tb-search-box ${showHistory ? "focused" : ""}`}>
              <svg className="tb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Bạn tìm gì hôm nay?"
                className="tb-search-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {keyword && (
                <button
                  className="tb-clear-btn"
                  onClick={() => { setKeyword(""); inputRef.current?.focus(); }}
                  title="Xóa"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button className="tb-search-btn" onClick={handleSearch}>
                Tìm kiếm
              </button>
            </div>

            {/* History or Live Suggestions Dropdown */}
            {(showHistory || keyword.trim().length > 0) && renderSuggestionsOrHistory(false)}
          </div>

          {/* Right section */}
          <div className="tb-nav-right">
            {/* Mobile search icon */}
            <button
              className="tb-icon-btn tb-mobile-search-btn"
              onClick={handleOpenMobileSearch}
              aria-label="Tìm kiếm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {/* Vé của tôi */}
            <button
              type="button"
              className="tb-nav-link"
              title="Vé của tôi"
              onClick={() => {
                const token = localStorage.getItem("token");
                if (!token) {
                  navigate("/");
                  setShowLoginModal(true);
                } else {
                  navigate("/my-tickets");
                }
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z" />
                <path d="M13 5v2M13 17v2M13 11v2" />
              </svg>
              <span className="tb-nav-label">Vé của tôi</span>
            </button>

            {/* Auth area */}
            {user ? (
              <div className="user-menu-wrapper">
                <button className="tb-user-trigger" onClick={() => setShowUserMenu((v) => !v)}>
                  <span className="tb-avatar">{getInitial(user.fullName)}</span>
                  <span className="tb-username">Tài khoản</span>
                  <svg className={`tb-chevron ${showUserMenu ? "open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="tb-user-menu">
                    <Link to="/my-tickets" className="tb-menu-item" onClick={() => setShowUserMenu(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z" />
                        <path d="M13 5v2M13 17v2M13 11v2" />
                      </svg>
                      Vé của tôi
                    </Link>
                    <Link to="/profile" className="tb-menu-item" onClick={() => setShowUserMenu(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M20 21a8 8 0 1 0-16 0" />
                      </svg>
                      Trang cá nhân
                    </Link>
                    <Link to="/my-cart" className="tb-menu-item" onClick={() => setShowUserMenu(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M20 21a8 8 0 1 0-16 0" />
                      </svg>
                      Giỏ hàng của tôi
                    </Link>
                    <div className="tb-menu-divider" />
                    <button className="tb-menu-item tb-menu-logout" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="tb-login-btn" onClick={() => setShowLoginModal(true)}>
                <span className="tb-login-label">Đăng nhập<span className="tb-login-extra"> | Đăng ký</span></span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile search overlay with slide down animation */}
        {showMobileSearch && (
          <div
            className={`tb-mobile-search-overlay ${isClosingMobileSearch ? "closing" : ""}`}
            onClick={handleCloseMobileSearch}
          >
            <div
              className={`tb-mobile-search-container ${isClosingMobileSearch ? "closing" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tb-mobile-search-bar">
                <svg className="tb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={mobileInputRef}
                  type="text"
                  placeholder="Bạn tìm gì hôm nay?"
                  className="tb-mobile-search-input"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={() => { loadHistory(); setShowHistory(true); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { saveAndSearch(keyword); handleCloseMobileSearch(); }
                    if (e.key === "Escape") { handleCloseMobileSearch(); }
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  autoFocus
                />
                {keyword && (
                  <button
                    className="tb-clear-btn tb-mobile-clear-btn"
                    onClick={() => { setKeyword(""); mobileInputRef.current?.focus(); }}
                    title="Xóa"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  className="tb-mobile-close"
                  onClick={handleCloseMobileSearch}
                  aria-label="Đóng tìm kiếm"
                >
                  ✕
                </button>
              </div>

              {/* Mobile history or live suggestions */}
              {(showHistory || keyword.trim().length > 0) && renderSuggestionsOrHistory(true)}
            </div>
          </div>
        )}
      </header>

      {/* Login modal */}
      {showLoginModal && (
        <div className="tb-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="tb-modal-close" onClick={() => setShowLoginModal(false)}>✕</button>
            <LoginPage />
          </div>
        </div>
      )}
    </>
  );
}