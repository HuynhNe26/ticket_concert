import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Calendar, MapPin, Users, DollarSign, Edit2, Trash2, Eye, Filter, TrendingUp, Flame, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import LoadingAdmin from '../../../components/loading/loading';
import io from 'socket.io-client';
import EventToggle from './event_toggle';

const API_BASE = process.env.REACT_APP_API_URL;
const LIMIT = 5;

function Notification({ type, message, onClose }) {
    const config = {
        success: { icon: CheckCircle, bg: '#f0fdf4', border: '#86efac', color: '#15803d', iconColor: '#22c55e' },
        error:   { icon: XCircle,     bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', iconColor: '#ef4444' },
        warning: { icon: AlertTriangle,bg: '#fffbeb', border: '#fcd34d', color: '#b45309', iconColor: '#f59e0b' },
    };
    const c = config[type] || config.warning;
    const Icon = c.icon;

    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: '12px', padding: '14px 18px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            minWidth: '300px', maxWidth: '420px',
            animation: 'slideIn 0.3s ease',
        }}>
            <Icon size={20} color={c.iconColor} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '14px', color: c.color, fontWeight: '500' }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                <X size={16} color={c.iconColor} />
            </button>
        </div>
    );
}

function NotificationStack({ items, onRemove }) {
    return (
        <div style={{
            position: 'fixed', top: '24px', right: '24px',
            zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
            {items.map(n => (
                <Notification key={n.id} type={n.type} message={n.message} onClose={() => onRemove(n.id)} />
            ))}
        </div>
    );
}

export default function ManageEvent() {
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [events, setEvents] = useState([]);
    const [hotEvents, setHotEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({ totalTicketsSold: 0, revenue: 0 });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [yearFilter, setYearFilter] = useState('');

    // Notification stack
    const [notifications, setNotifications] = useState([]);
    const addNotif = (type, message) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { id, type, message }]);
    };
    const removeNotif = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

    // Confirm delete
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    // ── Setup socket ────────────────────────────────────────────────────────────
    useEffect(() => {
        // Reset state on filter change
        setEvents([]);
        setOffset(0);
        setTotal(0);
        setLoading(true);

        const socket = io(API_BASE);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join_admin');
            socket.emit('requestHotEvents');
            socket.emit('requestAllEvents', { offset: 0, limit: LIMIT });
        });

        socket.on('hotEvents', (data) => {
            setHotEvents(data);
            calculateStats(data);
        });

        socket.on('allEvents', ({ events: newEvents, offset: receivedOffset, total: totalCount }) => {
            setTotal(Number(totalCount) || 0);
            setLoading(false);
            setLoadingMore(false);

            if (receivedOffset === 0) {
                setEvents(newEvents);
            } else {
                setEvents(prev => [...prev, ...newEvents]);
            }
        });

        const timer = setInterval(() => {
            socket.emit('requestHotEvents');
        }, 2000);

        return () => {
            clearInterval(timer);
            socket.off('hotEvents');
            socket.off('allEvents');
            socket.disconnect();
        };
    }, [searchTerm, filterStatus, yearFilter]);

    const calculateStats = (data) => {
        const totalTicketsSold = data.reduce((sum, e) => sum + Number(e.ticketssold || 0), 0);
        const revenue = data.reduce((sum, e) => sum + Number(e.revenue || 0), 0);
        setStats({ totalTicketsSold, revenue });
    };

    const handleLoadMore = () => {
        const nextOffset = offset + LIMIT;
        setOffset(nextOffset);
        setLoadingMore(true);
        socketRef.current?.emit('requestAllEvents', { offset: nextOffset, limit: LIMIT });
    };

    const handleEditEvent = (eventId) => navigate(`/admin/events/edit/${eventId}`);

    const handleDeleteEvent = (eventId) => {
        setPendingDeleteId(eventId);
        addNotif('warning', 'Bấm nút xóa lần nữa để xác nhận xóa sự kiện này!');
    };

    const handleConfirmDelete = async (eventId) => {
        setPendingDeleteId(null);
        try {
            const response = await fetch(`${API_BASE}/api/admin/events/${eventId}`, { method: 'DELETE' });
            if (response.ok) {
                setEvents(prev => prev.filter(e => e.event_id !== eventId));
                setTotal(prev => prev - 1);
                addNotif('success', 'Xóa sự kiện thành công!');
            } else {
                addNotif('error', 'Xóa sự kiện thất bại!');
            }
        } catch (e) {
            addNotif('error', 'Lỗi khi xóa sự kiện: ' + e.message);
        }
    };

    const handleChangeStatus = async (eventId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/events/${eventId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isActive: newStatus }),
            });
            if (!res.ok) throw new Error('Cập nhật thất bại');
            addNotif('success', 'Cập nhật trạng thái thành công!');
        } catch (err) {
            addNotif('error', err.message);
        }
    };

    const getStatusBadge = (status, eventStart, eventEnd) => {
        const now = new Date();
        const startDate = eventStart ? new Date(eventStart) : null;
        const endDate = eventEnd ? new Date(eventEnd) : null;

        const isEnded = (endDate && endDate < now) || !status;
        const isUpcoming = !isEnded && startDate && startDate > now;

        const cfg = isEnded
            ? { label: 'Đã kết thúc', bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' }
            : isUpcoming
                ? { label: 'Sắp mở bán', bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' }
                : { label: 'Đang bán',    bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' };

        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 12px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '600',
                background: cfg.bg, color: cfg.color
            }}>
                <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: cfg.dot,
                    ...(!isEnded && !isUpcoming ? { animation: 'pulseDot 1.5s ease-in-out infinite' } : {})
                }} />
                {cfg.label}
                {isUpcoming && startDate && (
                    <span style={{ fontSize: '11px', opacity: 0.75, fontWeight: '400' }}>
                        · {formatDate(eventStart)}
                    </span>
                )}
            </span>
        );
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount);

    const formatDate = (dateStr) =>
        dateStr ? dateStr.toString().slice(0, 10).split('-').reverse().join('-') : 'Chưa có';

    const hasMore = events.length < total;

    // ── Filter (client-side for current page) ───────────────────────────────────
    const filteredEvents = events.filter(event => {
        const matchesSearch =
            event.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.event_location?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || String(event.event_status) === filterStatus;
        const matchesYear = !yearFilter || (event.event_start && new Date(event.event_start).getFullYear() === Number(yearFilter));
        return matchesSearch && matchesStatus && matchesYear;
    });

    const statsCards = [
        { label: 'Tổng Sự Kiện',  value: total,                            icon: Calendar,   color: '#3b82f6' },
        { label: 'Đang Diễn Ra',  value: hotEvents.length,                  icon: Flame,      color: '#f97316' },
        { label: 'Vé Đã Bán',     value: stats.totalTicketsSold,            icon: Users,      color: '#8b5cf6' },
        { label: 'Doanh Thu',     value: formatCurrency(stats.revenue),     icon: DollarSign, color: '#10b981' },
    ];

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', marginTop: '50px' }}>
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(24px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.5; }
                }
                @keyframes pulseDot {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50%       { transform: scale(1.5); opacity: 0.6; }
                }
            `}</style>

            {/* Notification Stack */}
            <NotificationStack items={notifications} onRemove={removeNotif} />

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                    Quản Lý Sự Kiện
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                    Quản lý và theo dõi tất cả các sự kiện đang diễn ra
                </p>
            </div>

            {/* Hot Events */}
            {hotEvents.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    borderRadius: '16px', padding: '20px', marginBottom: '24px',
                    color: 'white', boxShadow: '0 4px 20px rgba(249,115,22,0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Flame size={24} />
                        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Sự kiện đang mở bán</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {hotEvents.map((event, index) => (
                            <div key={event.event_id} style={{
                                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                                borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '15px', fontWeight: '600', flex: 1, marginRight: '8px' }}>{event.event_name}</div>
                                    <div style={{ fontSize: '13px', fontWeight: '500', opacity: 0.85, marginRight: '8px' }}>{event.category_name}</div>
                                    <div style={{ background: 'rgba(255,255,255,0.3)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                                        #{index + 1}
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', opacity: '0.9', marginBottom: '12px' }}>
                                    <TrendingUp size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                    Đã bán {event.ticketssold} / {event.totaltickets} vé
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.2)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        background: 'white', height: '100%',
                                        width: `${Math.min((Number(event.ticketssold || 0) / Number(event.totaltickets || 1)) * 100, 100)}%`,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {statsCards.map((stat, index) => (
                    <div key={index} style={{
                        background: 'white', padding: '24px', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '16px'
                    }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: stat.color + '20',
                        }}>
                            <stat.icon size={26} color={stat.color} />
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{stat.label}</div>
                            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text" placeholder="Tìm kiếm sự kiện..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 40px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Filter size={38} color="#64748b" />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '10px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                            <option value="all">Tất cả</option>
                            <option value="true">Đang bán</option>
                            <option value="false">Đã kết thúc</option>
                        </select>
                        <input
                            type="number" placeholder="Năm (vd: 2025)" value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)} min="2020" max="2100"
                            style={{ padding: '10px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '140px', outline: 'none' }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                    <button onClick={() => navigate('/admin/events/add')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white', border: 'none', borderRadius: '10px',
                            fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(102,126,234,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <Plus size={18} /> Tạo Sự Kiện Mới
                    </button>
                </div>
            </div>

            {/* Events List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <LoadingAdmin />
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {filteredEvents.map((event) => (
                            <div key={event.event_id} style={{
                                background: 'white', borderRadius: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden',
                                transition: 'box-shadow 0.3s, transform 0.2s'
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
                                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {event.event_name}
                                                </h3>
                                                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Calendar size={14} /> {formatDate(event.event_start)}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <MapPin size={14} /> {event.event_location || 'Chưa có'}
                                                    </span>
                                                </div>
                                                {getStatusBadge(event.event_status, event.event_start, event.event_end)}
                                            </div>
                                            <EventToggle
                                                initialStatus={event.event_status}
                                                onChange={(newStatus) => handleChangeStatus(event.event_id, newStatus)}
                                            />
                                        </div>

                                        {/* Progress bar */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                                <span style={{ color: '#64748b' }}>Vé đã bán</span>
                                                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                                    {event.ticketssold || 0} / {event.totaltickets || 0}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${Math.min((Number(event.ticketssold || 0) / Number(event.totaltickets || 1)) * 100, 100)}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                        </div>

                                        {/* Bottom row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '24px' }}>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doanh thu</div>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                                                        {formatCurrency(event.revenue || 0)} ₫
                                                    </div>
                                                </div>
                                                {event.category_name && (
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Danh mục</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{event.category_name}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => navigate(`/admin/events/${event.event_id}`)}
                                                    title="Xem chi tiết"
                                                    style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                                >
                                                    <Eye size={17} color="#64748b" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditEvent(event.event_id)}
                                                    title="Chỉnh sửa"
                                                    style={{ padding: '8px 12px', background: '#eff6ff', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                                                >
                                                    <Edit2 size={17} color="#667eea" />
                                                </button>
                                                <button
                                                    onClick={() => pendingDeleteId === event.event_id ? handleConfirmDelete(event.event_id) : handleDeleteEvent(event.event_id)}
                                                    title={pendingDeleteId === event.event_id ? 'Bấm lần nữa để xác nhận xóa' : 'Xóa sự kiện'}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: pendingDeleteId === event.event_id ? '#fee2e2' : '#fef2f2',
                                                        border: pendingDeleteId === event.event_id ? '2px solid #fca5a5' : '2px solid transparent',
                                                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = pendingDeleteId === event.event_id ? '#fee2e2' : '#fef2f2'}
                                                >
                                                    <Trash2 size={17} color="#ef4444" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                style={{
                                    padding: '14px 48px',
                                    background: loadingMore ? '#f1f5f9' : 'white',
                                    border: `2px solid ${loadingMore ? '#cbd5e1' : '#667eea'}`,
                                    borderRadius: '12px',
                                    color: loadingMore ? '#94a3b8' : '#667eea',
                                    fontSize: '15px', fontWeight: '600',
                                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                                onMouseEnter={(e) => { if (!loadingMore) { e.currentTarget.style.background = '#667eea'; e.currentTarget.style.color = 'white'; } }}
                                onMouseLeave={(e) => { if (!loadingMore) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#667eea'; } }}
                            >
                                {loadingMore ? (
                                    <>
                                        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                        Đang tải...
                                    </>
                                ) : (
                                    `Xem thêm ${Math.min(LIMIT, total - events.length)} sự kiện`
                                )}
                            </button>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {/* Show total info */}
                    {events.length > 0 && (
                        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#94a3b8' }}>
                            Hiển thị {filteredEvents.length} / {total} sự kiện
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredEvents.length === 0 && (
                        <div style={{ background: 'white', padding: '60px 20px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <Calendar size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Không tìm thấy sự kiện</h3>
                            <p style={{ fontSize: '14px', color: '#94a3b8' }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}