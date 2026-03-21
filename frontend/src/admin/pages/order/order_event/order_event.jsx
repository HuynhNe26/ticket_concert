import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LoadingAdmin from "../../../components/loading/loading";
import io from 'socket.io-client';
import "./order_event.css";

const API_BASE = process.env.REACT_APP_API_URL;

const STATUS_MAP = {
    pending:    { label: "Chờ xác nhận", class: "status--pending" },
    confirmed:  { label: "Đã xác nhận",  class: "status--confirmed" },
    paid:       { label: "Đã thanh toán", class: "status--paid" },
    cancelled:  { label: "Đã huỷ",        class: "status--cancelled" },
    completed:  { label: "Hoàn thành",    class: "status--completed" },
};

function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function OrderEvent() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [sortConfig, setSortConfig] = useState({ key: "createdAt", dir: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;
    const [searchParams] = useSearchParams()

    const navigate = useNavigate();
    const id = searchParams.get("id")
    const name = searchParams.get("name")

    useEffect(() => {
        const socket = io(API_BASE);

        socket.on('connect', () => {
            socket.emit("join_admin");
        });

        socket.emit("join_event", { eventId: id });

        socket.on('orderEvent', (data) => {
            setOrders(data);
            console.log(data)
            setLoading(false);
        });


        const timer = setInterval(() => {
            socket.emit("requestOrderEvents", { eventId: id });
        }, 1000);

        return () => {
            clearInterval(timer);
            socket.off("orderEvent");
            socket.disconnect();
        };
    },[]);

    const handleSort = (key) => {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "asc" }
        );
        setCurrentPage(1);
    };

    const filtered = orders
    .filter((o) => {
        const q = search.toLowerCase();

        const matchSearch =
        !q ||
        o.payment_ref?.toLowerCase().includes(q) ||
        o.event_name?.toLowerCase().includes(q);

        const matchStatus =
        filterStatus === "all" || o.payment_status === filterStatus;

        return matchSearch && matchStatus;
    })
        .sort((a, b) => {
            let va = a[sortConfig.key];
            let vb = b[sortConfig.key];
            if (sortConfig.key === "totalAmount") {
                va = Number(va) || 0;
                vb = Number(vb) || 0;
            } else {
                va = va ? String(va).toLowerCase() : "";
                vb = vb ? String(vb).toLowerCase() : "";
            }
            if (va < vb) return sortConfig.dir === "asc" ? -1 : 1;
            if (va > vb) return sortConfig.dir === "asc" ? 1 : -1;
            return 0;
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const totalRevenue = orders
        .filter((o) => o.payment_status !== "cancelled")
        .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

    const SortIcon = ({ col }) => {
        if (sortConfig.key !== col) return <span className="sort-icon sort-icon--idle">⇅</span>;
        return (
            <span className="sort-icon sort-icon--active">
                {sortConfig.dir === "asc" ? "↑" : "↓"}
            </span>
        );
    };

    if (loading) return <LoadingAdmin />;

    return (
        <div className="oe-wrapper">
            {/* Header */}
            <div className="oe-header">
                <button className="oe-back-btn" onClick={() => navigate("/admin/orders")}>
                    ← Quay lại
                </button>
                <div className="oe-title-block">
                    <h1 className="oe-title">Đơn hàng sự kiện</h1>
                    <span className="oe-event-id">{name}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="oe-stats">
                <div className="oe-stat-card">
                    <span className="oe-stat-label">Tổng đơn</span>
                    <span className="oe-stat-value">{orders.length}</span>
                </div>
                <div className="oe-stat-card">
                    <span className="oe-stat-label">Đã thanh toán</span>
                    <span className="oe-stat-value oe-stat-value--green">
                        {orders.filter((o) => o.payment_status === "paid" || o.payment_status === "completed").length}
                    </span>
                </div>
                <div className="oe-stat-card">
                    <span className="oe-stat-label">Đã huỷ</span>
                    <span className="oe-stat-value oe-stat-value--red">
                        {orders.filter((o) => o.payment_status === "cancelled").length}
                    </span>
                </div>
                <div className="oe-stat-card oe-stat-card--accent">
                    <span className="oe-stat-label">Doanh thu</span>
                    <span className="oe-stat-value">{formatCurrency(totalRevenue)}</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="oe-toolbar">
                <div className="oe-search-wrap">
                    <span className="oe-search-icon">🔍</span>
                    <input
                        className="oe-search"
                        type="text"
                        placeholder="Tìm theo mã đơn, tên, email, SĐT..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                    {search && (
                        <button className="oe-search-clear" onClick={() => setSearch("")}>✕</button>
                    )}
                </div>
                <select
                    className="oe-filter-status"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                >
                    <option value="all">Tất cả trạng thái</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <span className="oe-result-count">
                    {filtered.length} kết quả
                </span>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="oe-empty">
                    <div className="oe-empty-icon">📭</div>
                    <p>Không tìm thấy đơn hàng nào.</p>
                </div>
            ) : (
                <>
                    <div className="oe-table-wrap">
                        <table className="oe-table">
                            <thead>
                                <tr>
                                    <th className="oe-th" onClick={() => handleSort("_id")}>
                                        Mã đơn <SortIcon col="payment_ref" />
                                    </th>
                                    <th className="oe-th" onClick={() => handleSort("customerName")}>
                                        Khách hàng <SortIcon col="customerName" />
                                    </th>
                                    <th className="oe-th">Liên hệ</th>
                                    <th className="oe-th" onClick={() => handleSort("totalAmount")}>
                                        Tổng tiền <SortIcon col="totalAmount" />
                                    </th>
                                    <th className="oe-th" onClick={() => handleSort("status")}>
                                        Trạng thái <SortIcon col="status" />
                                    </th>
                                    <th className="oe-th" onClick={() => handleSort("createdAt")}>
                                        Ngày tạo <SortIcon col="createdAt" />
                                    </th>
                                    <th className="oe-th oe-th--center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((order, idx) => {
                                    const STATUS_MAP = {
                                        "Thành công": { label: "Đã thanh toán", class: "status--paid" },
                                        "Chờ thanh toán": { label: "Chờ thanh toán", class: "status--pending" },
                                        "Huỷ": { label: "Đã huỷ", class: "status--cancelled" }
                                    };
                                    return (
                                        <tr key={order.payment_id} className={`oe-tr ${idx % 2 === 0 ? "oe-tr--even" : ""}`}>
                                            <td className="oe-td oe-td--id">
                                                <span className="oe-order-id" title={order._id}>
                                                    {order.payment_ref}
                                                </span>
                                            </td>
                                            <td className="oe-td">
                                                <span className="oe-customer-name">{order.fullname || "—"}</span>
                                            </td>
                                            <td className="oe-td oe-td--contact">
                                                <div>{order.email || "—"}</div>
                                            </td>
                                            <td className="oe-td oe-td--amount">
                                                {formatCurrency(order.total_price)}
                                            </td>
                                            <td className="oe-td">
                                                <span className={`oe-status`}>
                                                    
                                                </span>
                                            </td>
                                            <td className="oe-td oe-td--date">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="oe-td oe-td--actions">
                                                <button
                                                    className="oe-btn-detail"
                                                    onClick={() => navigate(`/admin/orders/${order.payment_id}`)}
                                                >
                                                    Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="oe-pagination">
                            <button
                                className="oe-page-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                            >«</button>
                            <button
                                className="oe-page-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => p - 1)}
                            >‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                .reduce((acc, p, i, arr) => {
                                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === "..." ? (
                                        <span key={`ellipsis-${i}`} className="oe-page-ellipsis">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            className={`oe-page-btn ${currentPage === p ? "oe-page-btn--active" : ""}`}
                                            onClick={() => setCurrentPage(p)}
                                        >{p}</button>
                                    )
                                )}
                            <button
                                className="oe-page-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => p + 1)}
                            >›</button>
                            <button
                                className="oe-page-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                            >»</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}