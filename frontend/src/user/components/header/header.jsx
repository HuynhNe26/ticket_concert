import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./header.css";
import  LoginPage from "../../pages/login/Loginpage"
import Success from "../notification/success/success";
const API_BASE = process.env.REACT_APP_API_URL;

export default function Header() {
  const [user, setUser] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token')
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".user-menu-wrapper")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSearch = () => {
    if (!token) {
      let history = [];
      let data = localStorage.getItem('historySearch');

      try {
        const parsed = data ? JSON.parse(data) : [];
        history = Array.isArray(parsed) ? parsed : [];
      } catch {
        history = [];
      }

      history = history.filter(item => item !== keyword);
      history.unshift(keyword);
      history = history.slice(0, 4);

      localStorage.setItem('historySearch', JSON.stringify(history));
    }
    navigate(`/search?q=${encodeURIComponent(keyword)}`);
    setShowMobileSearch(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowMobileSearch(false);
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
            <img src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776499227/xmcn7vabeqm6lgnvl0pm.png" style={{width: "auto", height: "60px"}} alt="Logo" />
          </Link>

          {/* Desktop Search */}
          <div className="tb-search-wrapper">
            <div className="tb-search-box">
              <svg className="tb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Bạn tìm gì hôm nay?"
                className="tb-search-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="tb-search-btn" onClick={handleSearch}>
                Tìm kiếm
              </button>
            </div>
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
                <button
                  className="tb-user-trigger"
                  onClick={() => setShowUserMenu((v) => !v)}
                >
                  <span className="tb-avatar">{getInitial(user.fullName)}</span>
                  <span className="tb-username">Tài khoản</span>
                  <svg
                    className={`tb-chevron ${showUserMenu ? "open" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
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
              <button
                className="tb-login-btn"
                onClick={() => setShowLoginModal(true)}
              >
                <span className="tb-login-label">Đăng nhập | Đăng ký</span>
              </button>
            )}

          </div>
        </div>

        {/* Mobile search overlay */}
        {showMobileSearch && (
          <div className="tb-mobile-search-overlay" onClick={() => setShowMobileSearch(false)}>
            <div className="tb-mobile-search-bar" onClick={(e) => e.stopPropagation()}>
              <svg className="tb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Bạn tìm gì hôm nay?"
                className="tb-mobile-search-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button className="tb-mobile-close" onClick={() => setShowMobileSearch(false)}>✕</button>
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