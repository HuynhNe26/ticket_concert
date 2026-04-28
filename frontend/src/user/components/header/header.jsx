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
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  // Search history dropdown
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState([]);
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

  const saveAndSearch = (kw) => {
    if (!kw.trim()) return;
    if (!token) {
      let history = [];
      try {
        const data = localStorage.getItem("historySearch");
        const parsed = data ? JSON.parse(data) : [];
        history = Array.isArray(parsed) ? parsed : [];
      } catch {
        history = [];
      }
      history = history.filter((item) => item !== kw);
      history.unshift(kw);
      history = history.slice(0, 4);
      localStorage.setItem("historySearch", JSON.stringify(history));
    }
    setShowHistory(false);
    navigate(`/search?q=${encodeURIComponent(kw)}`);
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
              style={{ width: "auto", height: "60px" }}
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

            {/* History Dropdown */}
            {showHistory && historySearch.length > 0 && (
              <div className="tb-history-dropdown">
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
                      onClick={() => handleHistoryClick(item)}
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
            )}
          </div>

          {/* Right section */}
          <div className="tb-nav-right">
            {/* Mobile search icon */}
            <button
              className="tb-icon-btn tb-mobile-search-btn"
              onClick={() => setShowMobileSearch(true)}
              aria-label="Tìm kiếm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {/* Vé của tôi */}
            <Link to="/my-tickets" className="tb-nav-link" title="Vé của tôi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z" />
                <path d="M13 5v2M13 17v2M13 11v2" />
              </svg>
              <span className="tb-nav-label">Vé của tôi</span>
            </Link>

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
                <span className="tb-login-label">Đăng nhập | Đăng ký</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile search overlay */}
        {showMobileSearch && (
          <div className="tb-mobile-search-overlay" onClick={() => { setShowMobileSearch(false); setShowHistory(false); }}>
            <div className="tb-mobile-search-container" onClick={(e) => e.stopPropagation()}>
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
                    if (e.key === "Enter") { saveAndSearch(keyword); setShowMobileSearch(false); }
                    if (e.key === "Escape") { setShowMobileSearch(false); setShowHistory(false); }
                  }}
                  autoFocus
                />
                <button className="tb-mobile-close" onClick={() => { setShowMobileSearch(false); setShowHistory(false); }}>✕</button>
              </div>

              {/* Mobile history */}
              {showHistory && historySearch.length > 0 && (
                <div className="tb-mobile-history">
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
                        onClick={() => { handleHistoryClick(item); setShowMobileSearch(false); }}
                      >
                        <svg className="tb-history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        <span className="tb-history-text">{item}</span>
                        <button
                          className="tb-history-delete"
                          onClick={(e) => handleDeleteHistory(e, item)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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