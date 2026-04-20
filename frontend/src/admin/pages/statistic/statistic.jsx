import React, { useState, useEffect } from "react";
import LoadingAdmin from "../../components/loading/loading"; 
import "./statistic.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const API_BASE = process.env.REACT_APP_API_URL;

export default function StatisticPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const [allOrders, setAllOrders] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE}/api/admin/statistic/orders`);
                const result = await response.json();
                
                if (result.success) {
                    setAllOrders(result.data);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu thống kê:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);
    useEffect(() => {
        if (!allOrders || allOrders.length === 0) return;
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
            day: `${i + 1}/${selectedMonth}`,
            revenue: 0
        }));

        allOrders.forEach(order => {
            if (!order.created_at) return;
            
            const orderDate = new Date(order.created_at);
            const orderMonth = orderDate.getMonth() + 1;
            const orderYear = orderDate.getFullYear();
            if (orderMonth === selectedMonth && orderYear === selectedYear) {
                const dayIndex = orderDate.getDate() - 1;
                dailyData[dayIndex].revenue += Number(order.total_price || 0);
            }
        });

        setChartData(dailyData);
    }, [allOrders, selectedMonth, selectedYear]);
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    return (
        <div style={{ marginTop: "60px", padding: "20px" }}>
            <h2>Thống Kê Doanh Thu Sự Kiện</h2>
            
            {/* Bộ lọc Tháng & Năm */}
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    style={{ padding: "8px", borderRadius: "4px" }}
                >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>Tháng {month}</option>
                    ))}
                </select>

                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    style={{ padding: "8px", borderRadius: "4px" }}
                >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <option key={year} value={year}>Năm {year}</option>
                    ))}
                </select>
            </div>
            {isLoading ? (
                <LoadingAdmin />
            ) : (
                <div style={{ width: "100%", height: "400px", backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="day" 
                                tick={{ fontSize: 12 }} 
                            />
                            <YAxis 
                                tickFormatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                                formatter={(value) => [formatCurrency(value), "Doanh thu"]}
                                labelStyle={{ color: 'black' }}
                            />
                            <Bar 
                                dataKey="revenue" 
                                fill="#4f46e5" 
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}