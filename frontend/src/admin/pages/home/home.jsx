import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/authAdmin";
import "./home.css";

const API_BASE = process.env.REACT_APP_API_URL;
/* ===== ICON COMPONENT ===== */
const Icon = ({ children, size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
  >
    {children}
  </svg>
);

export default function HomeAdmin() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState ([]);
  const [eventTotal, setEventTotal] = useState ([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const now = new Date();
  const year = new Date().getFullYear();

  useEffect(() => {

    const getUser = async () => {
      try {
        const res = await fetch (`${API_BASE}/api/admin/users/`);

        const data = await res.json();
        if (data.success) {
          setUsers(data.data)
        }
      } catch (err) {
        console.log(err)
      }
    }

    const getEvent = async () => {
      try {
        const res = await fetch (`${API_BASE}/api/admin/events/statistic`);
        const resTotal = await fetch (`${API_BASE}/api/admin/events/`);
        const data = await res.json();
        const dataTotal = await resTotal.json();
        if (data.success) {
          setEvents(data.data)
        }

        if (dataTotal.success) {
          setEventTotal(dataTotal.data)
        }
      } catch (err) {
        console.log(err)
      }
    }

    const getOrder = async () => {
      try {
        const res = await fetch (`${API_BASE}/api/admin/orders/`);

        const data = await res.json();
        if (data.success) {
          setOrders(data.data)
          console.log(data.data)
        }
      } catch (err) {
        console.log(err)
      }
    }
    
    getUser();
    getEvent();
    getOrder();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);


    return () => clearInterval(timer);
  }, []);

  const totalRevenue = orders.reduce(
    (sum, item) => sum + Number(item.revenue), 0
  );

  // Stats data
  const stats = [
    {
      title: "Người dùng",
      value: `${users.length}`,
      icon: (
        <Icon>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Icon>
      ),
      color: "blue",
      link: "/admin/user",
    },
    {
      title: "Sự kiện đang mở bán",
      value: `${events}`,
      icon: (
        <Icon>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </Icon>
      ),
      color: "purple",
      link: "/admin/events",
    },
    {
      title: "Tổng sự kiện",
      value: `${eventTotal.length}`,
      icon: (
        <Icon>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </Icon>
      ),
      color: "purple",
      link: "/admin/events",
    },
    {
      title: "Tổng đơn hàng",
      value: `${orders.length}`,
      icon: (
        <Icon>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </Icon>
      ),
      color: "green",
      link: "/admin/orders",
    },
    {
      title: "Tổng doanh thu",
      value: `${totalRevenue.toLocaleString("VN-Vi")}`,
      icon: (
        <Icon>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </Icon>
      ),
      color: "orange",
      link: "/admin/report",
    },
  ];

  // Quick actions
  const quickActions = [
    {
      title: "Add Admin",
      description: "Create new user account",
      icon: (
        <Icon size={28}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </Icon>
      ),
      color: "blue",
      link: "/admin/add",
    },
    {
      title: "Add Product",
      description: "Create new product",
      icon: (
        <Icon size={28}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
          <polyline points="7.5 19.79 7.5 14.6 3 12" />
          <polyline points="21 12 16.5 14.6 16.5 19.79" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </Icon>
      ),
      color: "purple",
      link: "/admin/products/add",
    },
    {
      title: "View Orders",
      description: "Manage all orders",
      icon: (
        <Icon size={28}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </Icon>
      ),
      color: "green",
      link: "/admin/orders",
    },
    {
      title: "Settings",
      description: "System configuration",
      icon: (
        <Icon size={28}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.25m7.07 7.07l4.24 4.25M1 12h6m6 0h6M4.22 19.78l4.24-4.25m7.07-7.07l4.24-4.25" />
        </Icon>
      ),
      color: "orange",
      link: "/admin/settings",
    },
  ];

  return (
    <div className="admin-home">
      <div className="admin-container">
        
        {/* HEADER */}
        <div className="admin-header">
          <div className="header-content">
            <div className="header-text">
              <h1 className="header-title">
                Chào mừng trở lại, <span className="highlight">{admin?.fullname || "Admin"}</span>
              </h1>
            </div>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`stat-card stat-${stat.color}`}
              onClick={() => navigate(stat.link)}
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <div className="stat-title">{stat.title}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
          
          {/* LEFT COLUMN */}
          <div className="content-left">
            
            {/* QUICK ACTIONS */}
            <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">Hành động nhanh</h2>
              </div>
              <div className="quick-actions-grid">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className={`action-card action-${action.color}`}
                    onClick={() => navigate(action.link)}
                  >
                    <div className="action-icon">{action.icon}</div>
                    <div className="action-content">
                      <div className="action-title">{action.title}</div>
                      <div className="action-description">{action.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CHART PLACEHOLDER */}
            <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">Thống kê doanh thu</h2>
                <p className="section-subtitle">Doanh thu theo tháng của năm {year}</p>
              </div>
              <div className="chart-placeholder">
                <div className="chart-bars">
                  <div className="bar" style={{ height: "60%" }}>
                    <span className="bar-label">Jan</span>
                  </div>
                  <div className="bar" style={{ height: "75%" }}>
                    <span className="bar-label">Feb</span>
                  </div>
                  <div className="bar" style={{ height: "50%" }}>
                    <span className="bar-label">Mar</span>
                  </div>
                  <div className="bar" style={{ height: "85%" }}>
                    <span className="bar-label">Apr</span>
                  </div>
                  <div className="bar" style={{ height: "70%" }}>
                    <span className="bar-label">May</span>
                  </div>
                  <div className="bar" style={{ height: "95%" }}>
                    <span className="bar-label">Jun</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="content-right">

            {/* SYSTEM STATUS */}
            <div className="section-card">
              <div className="section-header">
                <h2 className="section-title">System Status</h2>
                <p className="section-subtitle">All systems operational</p>
              </div>
              <div className="status-list">
                <div className="status-item">
                  <div className="status-info">
                    <div className="status-name">API Services</div>
                    <div className="status-badge status-success">Operational</div>
                  </div>
                  <div className="status-bar">
                    <div className="status-progress" style={{ width: "100%" }}></div>
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-info">
                    <div className="status-name">Database</div>
                    <div className="status-badge status-success">Operational</div>
                  </div>
                  <div className="status-bar">
                    <div className="status-progress" style={{ width: "98%" }}></div>
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-info">
                    <div className="status-name">Payment Gateway</div>
                    <div className="status-badge status-success">Operational</div>
                  </div>
                  <div className="status-bar">
                    <div className="status-progress" style={{ width: "100%" }}></div>
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-info">
                    <div className="status-name">Storage</div>
                    <div className="status-badge status-warning">Limited</div>
                  </div>
                  <div className="status-bar">
                    <div className="status-progress status-warning" style={{ width: "78%" }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}