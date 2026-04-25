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
  const [events, setEvents] = useState([]);
  const [eventTotal, setEventTotal] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // States cho thống kê theo tháng hiện tại
  const [currentMonthUsers, setCurrentMonthUsers] = useState(0);
  const [currentMonthOrders, setCurrentMonthOrders] = useState(0);
  const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [ticketStats, setTicketStats] = useState([]);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

  useEffect(() => {
    const fetchByMonth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/statistic/calendar?month=${selectedMonth}&year=${selectedYear}`);
        const data = await res.json();
        if (data.success) setTicketStats(data.data);
      } catch (err) { console.log(err); }
    };
    fetchByMonth();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/`);
        const data = await res.json();
        if (data.success) {
          setUsers(data.data);
          const newUsers = data.data.filter(u => {
            const date = new Date(u.created_at);
            return (date.getMonth() + 1) === currentMonth && date.getFullYear() === currentYear;
          });
          setCurrentMonthUsers(newUsers.length);
        }
      } catch (err) { console.log(err); }
    };

    const getOrder = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/orders/`);
        const data = await res.json();
        if (data.success) {
          setOrders(data.data);
          // Tính toán thống kê đơn hàng và doanh thu trong tháng hiện tại
          const thisMonthOrders = data.data.filter(o => {
            const date = new Date(o.order_date || o.created_at);
            return (date.getMonth() + 1) === currentMonth && date.getFullYear() === currentYear;
          });
          setCurrentMonthOrders(thisMonthOrders.length);
          const revenue = thisMonthOrders.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
          setCurrentMonthRevenue(revenue);
        }
      } catch (err) { console.log(err); }
    };

    const getEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/events/statistic`);
        const resTotal = await fetch(`${API_BASE}/api/admin/events/`);
        const data = await res.json();
        const dataTotal = await resTotal.json();
        if (data.success) setEvents(data.data);
        if (dataTotal.success) setEventTotal(dataTotal.data);
      } catch (err) { console.log(err); }
    };

    getUser();
    getEvent();
    getOrder();
  }, [currentMonth, currentYear]);

  const totalRevenue = orders.reduce((sum, item) => sum + Number(item.revenue), 0);

  const stats = [
    {
      title: "Người dùng",
      value: `${users.length} (+${currentMonthUsers} trong tháng)`,
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
      title: "Đơn hàng tháng này",
      // Thay đổi từ Sự kiện đang bán sang Tổng đơn hàng trong tháng
      value: `${currentMonthOrders}`,
      icon: (
        <Icon>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </Icon>
      ),
      color: "purple",
      link: "/admin/orders",
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
      title: "Doanh thu tháng này",
      // Thay đổi từ Tổng doanh thu sang Doanh thu trong tháng
      value: `${currentMonthRevenue.toLocaleString("vi-VN")} đ`,
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

  const quickActions = [
    {
      title: "Thêm Admin",
      description: "Tạo tài khoản admin mới",
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
      title: "Thêm sự kiện",
      description: "Tạo sự kiện mới",
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
      title: "Quán lý đơn hàng",
      description: "Xem thông tin chỉ tiết đơn",
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
                  <h2 className="section-title">Thống kê lượt bán</h2>
                  <p className="section-subtitle">Tỉ lệ vé được bán trong           
                      <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="year-filter-select"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select> 
                  </p>
                </div>
                <div className="month-filter-list">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`month-filter-btn ${selectedMonth === m ? "active" : ""}`}
                    >
                      T.{m}
                    </button>
                  ))}
                </div>
                {ticketStats.length === 0 ? (
                  <p className="empty-stats-message">
                    Không có sự kiện trong tháng {selectedMonth}
                  </p>
                ) : (
                  ticketStats.map((ev, i) => {
                    const sold = Number(ev.sold_tickets);
                    const total = Number(ev.total_tickets);
                    const pct = total > 0 ? Math.min(Math.round((sold / total) * 100), 100) : 0;
                    const color = pct >= 80 ? "#185FA5" : pct >= 50 ? "#0F6E56" : "#888780";
                    
                    return (
                      <div key={i} className="event-stat-item">
                        <div className="event-stat-header">
                          <span className="event-stat-name" title={ev.event_name}>
                            {ev.event_name}
                          </span>
                          <span 
                            className="event-stat-count" 
                            style={{ color: color }}
                          >
                            {sold.toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")} vé ({pct}%)
                          </span>
                        </div>
                        
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
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