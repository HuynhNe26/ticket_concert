import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL;

export default function ManageOrder() {
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const months = [
    { value: 1, label: "Tháng 1" },
    { value: 2, label: "Tháng 2" },
    { value: 3, label: "Tháng 3" },
    { value: 4, label: "Tháng 4" },
    { value: 5, label: "Tháng 5" },
    { value: 6, label: "Tháng 6" },
    { value: 7, label: "Tháng 7" },
    { value: 8, label: "Tháng 8" },
    { value: 9, label: "Tháng 9" },
    { value: 10, label: "Tháng 10" },
    { value: 11, label: "Tháng 11" },
    { value: 12, label: "Tháng 12" },
  ];

  const years = [];
  for (let y = 2020; y <= 2130; y++) {
    years.push(y);
  }

  const handleSearch = async () => {
    if (!month || !year) {
      alert("Vui lòng chọn tháng và năm");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/orders?month=${month}&year=${year}`
      );
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, marginTop: '200px' }}>
      <h2>Quản lý đơn hàng theo tháng</h2>

      <select value={month} onChange={(e) => setMonth(e.target.value)}>
        <option value="">Chọn tháng</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="">Chọn năm</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button onClick={handleSearch} disabled={loading}>
        {loading ? "Đang tải..." : "Xem sự kiện"}
      </button>

      <hr />

      {events.length === 0 && !loading && <p>Không có sự kiện</p>}

      {events.map((event) => (
        <div
          key={event.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <h4>{event.name}</h4>
          <p>Ngày: {event.date}</p>
        </div>
      ))}
    </div>
  );
}