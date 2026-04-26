import React, { useState, useEffect } from "react";
import "./statistic.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = process.env.REACT_APP_API_URL || "";

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatShort = (value) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value;
};

const FILTERS = [
  "Báo cáo theo ngày",
  "Báo cáo theo tuần",
  "Báo cáo theo tháng",
];

export default function StatisticPage() {
  const [reportType, setReportType] = useState("Báo cáo theo ngày");
  
  // Tự động lấy ngày đầu tháng và ngày cuối tháng hiện tại
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 2).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return lastDay.toISOString().split('T')[0];
  });

  const [allOrders, setAllOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({
    revenue: 0,
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/statistic/orders`);
        const result = await res.json();
        if (result.success) setAllOrders(result.data);
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!allOrders.length) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = allOrders.filter((o) => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d >= start && d <= end && o.payment_status === "Thành công";
    });

    const map = new Map();

    filtered.forEach((o) => {
      const d = new Date(o.created_at);
      let key;

      if (reportType === "Báo cáo theo ngày") {
        key = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      } else if (reportType === "Báo cáo theo tuần") {
        const week = getWeekNumber(d);
        key = `T${week}/${d.getFullYear()}`;
      } else {
        key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      }

      const prev = map.get(key) || { revenue: 0 };
      const price = Number(o.total_price || 0);
      map.set(key, {
        revenue: prev.revenue + price,
      });
    });

    const sorted = Array.from(map.entries())
      .sort((a, b) => {
        const parseDate = (s) => {
          const parts = s.split("/").map(Number);
          if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
          if (parts.length === 2) return new Date(parts[1], parts[0] - 1, 1);
          return new Date(0);
        };
        return parseDate(a[0]) - parseDate(b[0]);
      })
      .map(([name, val]) => ({ name, ...val }));

    setChartData(sorted);

    const totalRevenue = filtered.reduce(
      (s, o) => s + Number(o.total_price || 0),
      0
    );
    setSummary({
      revenue: totalRevenue,
    });
  }, [allOrders, reportType, startDate, endDate]);

  const getWeekNumber = (d) => {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  };

  return (
    <div className="statics-wrapper">
      <div className="statics-pageTitle">Báo cáo doanh thu</div>
      
      <div className="statics-headerCombined">
        <div className="statics-filterRow">
          <div className="statics-filterGroup">
            <label className="statics-label">Loại thời gian</label>
            <select
              className="statics-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {FILTERS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="statics-filterGroup">
            <label className="statics-label">Ngày bắt đầu</label>
            <input
              type="date"
              className="statics-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="statics-filterGroup">
            <label className="statics-label">Ngày kết thúc</label>
            <input
              type="date"
              className="statics-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button className="statics-searchBtn">Tìm kiếm</button>
        </div>

        <div className="statics-summaryRight">
          <SummaryCard
            color="#3b82f6"
            label="Tổng doanh thu"
            value={summary.revenue}
            icon="💰"
          />
        </div>
      </div>

      <div className="statics-chartCard">
        <div className="statics-subTabs">
          <span className="statics-subTab statics-subTabActive">Tổng quan</span>
          <span className="statics-subTab">Chi tiết</span>
        </div>

        <div className="statics-chartTitle">DOANH THU THEO THỜI GIAN</div>

        <div className="statics-legendRow">
          <span className="statics-legendDot" style={{ background: "#3b82f6" }} />
          <span className="statics-legendText">Doanh thu</span>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
            barCategoryGap="40%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatShort} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), "Doanh thu"]}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SummaryCard({ color, label, value, icon }) {
  return (
    <div className="statics-card">
      <div className="statics-summaryIcon" style={{ background: color }}>
        {icon}
      </div>
      <div className="statics-summaryContent">
        <div className="statics-summaryValue">
          {new Intl.NumberFormat("vi-VN").format(value)}
        </div>
        <div className="statics-summaryLabel">{label}</div>
      </div>
    </div>
  );
}