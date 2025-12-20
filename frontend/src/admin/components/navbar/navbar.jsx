import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/authAdmin";
import "./navbar.css";

/* ===== ICON COMPONENT ===== */
const Icon = ({ children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="20"
    height="20"
  >
    {children}
  </svg>
);

/* ===== MENU CONFIG ===== */
const MENU = [
  {
    label: "Trang chủ",
    path: "/admin/",
    allowLevels: [1, 2],
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </Icon>
    ),
  },
  {
    label: "Người dùng",
    allowLevels: [1],
    icon: (
      <Icon>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </Icon>
    ),
    children: [
      {
        label: "Quản lý người dùng",
        path: "/admin/user",
        allowLevels: [1],
      },
    ],
  },
  {
    label: "Sự kiện",
    allowLevels: [1, 2],
    icon: (
      <Icon>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </Icon>
    ),
    children: [
      {
        label: "Quản lý sự kiện",
        path: "/admin/events",
        allowLevels: [1, 2],
      },
      {
        label: "Thêm sự kiện",
        path: "/admin/events/add",
        allowLevels: [1],
      },
      {
        label: "Quản lý bố cục",
        path: "/admin/layout/add",
        allowLevels: [1],
      },
      {
        label: "Thêm bố cục",
        path: "/admin/layout/add",
        allowLevels: [1],
      }
    ],
  },
  {
    label: "Đơn hàng",
    allowLevels: [1, 2],
    icon: (
      <Icon>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </Icon>
    ),
    children: [
      {
        label: "Quản lý đơn hàng",
        path: "/admin/orders",
        allowLevels: [1, 2],
      },
      {
        label: "Thống kê đơn hàng",
        path: "/admin/orders",
        allowLevels: [1, 2],
      },
    ],
  },
  {
    label: "Quản trị viên",
    allowLevels: [1, 2],
    icon: (
      <Icon>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </Icon>
    ),
    children: [
      {
        label: "Quản lý quản trị viên",
        path: "/admin/manage_admin",
        allowLevels: [1, 2],
      },
      {
        label: "Thêm quản trị viên",
        path: "/admin/add",
        allowLevels: [1, 2],
      },
    ],
  },
];

export default function Navbar() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [openParent, setOpenParent] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileRef = useRef(null);
  const menuRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }

      const clickedInsideMenu = Object.values(menuRefs.current).some(
        ref => ref && ref.contains(event.target)
      );
      
      if (!clickedInsideMenu) {
        setOpenParent(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenParent(null);
  }, [location]);

  if (!admin) return null;

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const isParentActive = (parent) => {
    if (parent.path && isActivePath(parent.path)) return true;
    if (parent.children) {
      return parent.children.some(child => isActivePath(child.path));
    }
    return false;
  };

  return (
    <nav className="navbar-admin">
      <div className="navbar-container">

        <div className="navbar-brand">
          <div className="brand-logo">
            <img alt="Logo" />
          </div>
          <span className="brand-text">Ticket Concert</span>
        </div>

        {/* ICON MENU KHI RESPONSIVE MOBILE */}
        <button 
          className="mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <Icon>
            {isMobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </Icon>
        </button>

        {/* MENU NGANG CHƯA RESPONSIVE */}
        <div className={`navbar-menu ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {MENU
            .filter(parent => parent.allowLevels.includes(admin.level))
            .map((parent, index) => (
              <div 
                key={parent.label}
                ref={el => menuRefs.current[index] = el}
                className={`menu-parent ${isParentActive(parent) ? 'active' : ''}`}
              >
                
                {/* PARENT ITEM */}
                <button
                  className={`menu-item ${isParentActive(parent) ? 'active' : ''}`}
                  onClick={() => {
                    if (parent.children) {
                      setOpenParent(openParent === index ? null : index);
                    } else {
                      navigate(parent.path);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                >
                  <span className="menu-icon">{parent.icon}</span>
                  <span className="menu-label">{parent.label}</span>
                  {parent.children && (
                    <span className={`menu-arrow ${openParent === index ? 'open' : ''}`}>
                      ▼
                    </span>
                  )}
                </button>

                {/* SUBMENU DROPDOWN */}
                {parent.children && openParent === index && (
                  <div className="submenu">
                    {parent.children
                      .filter(child => child.allowLevels.includes(admin.level))
                      .map(child => (
                        <button
                          key={child.path}
                          onClick={() => {
                            navigate(child.path);
                            setOpenParent(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`submenu-item ${isActivePath(child.path) ? 'active' : ''}`}
                        >
                          <span className="submenu-dot">•</span>
                          {child.label}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* THÔNG TIN CÁ NHÂN */}
        <div className="navbar-right" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => setShowProfile(!showProfile)}
            aria-label="User menu"
          >
            <div className="profile-avatar">
              {admin.email.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <span className="profile-name">{admin.fullname}</span>
              <span>{admin.level === 1 ? 'Quản trị viên cấp cao' : 'Quản trị viên'}</span>
            </div>
            <span className={`profile-arrow ${showProfile ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          {showProfile && (
            <div className="dropdown-menu">
              <button 
                onClick={() => {
                  navigate('/admin/profile');
                  setShowProfile(false);
                }}
                className="dropdown-item"
              >
                <Icon>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </Icon>
                Thông tin cá nhân
              </button>

                <button 
                  onClick={() => {
                    navigate('/admin/settings');
                    setShowProfile(false);
                  }}
                  className="dropdown-item"
                >
                  <Icon>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.25m7.07 7.07l4.24 4.25M1 12h6m6 0h6M4.22 19.78l4.24-4.25m7.07-7.07l4.24-4.25" />
                  </Icon>
                  Cài đặt
                </button>

              <div className="dropdown-divider" />

              <button 
                onClick={handleLogout} 
                className="dropdown-item logout"
              >
                <Icon>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </Icon>
                Đăng xuất
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}