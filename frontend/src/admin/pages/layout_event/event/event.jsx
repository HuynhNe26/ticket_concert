import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Thêm useNavigate
import { Search, Plus, Calendar, MapPin, Users, DollarSign, Edit2, Trash2, Eye, Filter, TrendingUp, Flame } from 'lucide-react';
import LoadingAdmin from '../../../components/loading/loading';
import io from 'socket.io-client';
import EventToggle from './event_toggle';

const API_BASE = process.env.REACT_APP_API_URL;

const LIMIT = 2;
export default function ManageEvent() {
    const navigate = useNavigate(); // Thêm navigate
    const [events, setEvents] = useState([]);
    const [hotEvents, setHotEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [yearFilter, setYearFilter] = useState('');
    const [offset, setOffset] = useState(0);
    const [stats, setStats] = useState({
        totalTicketsSold: 0,
        revenue: 0
    });

    useEffect(() => {
        setOffset(0);

        const socket = io(API_BASE);


        socket.on('connect', () => {
            socket.emit("join_admin");
        });

        // Listen for hot events updates
        socket.on('hotEvents', (data) => {
            setHotEvents(data);
            calculateStats(data);
        });

        socket.on('allEvents', (data) => {
            setEvents(data);
            calculateAllEvent(data)
        });


        const timer = setInterval(() => {
            socket.emit("requestHotEvents");
            socket.emit("requestAllEvents");
        }, 1000);

        return () => {
            clearInterval(timer);
            socket.off("hotEvents");
            socket.off("allEventsz1");
            socket.off("ticketSold");
            socket.disconnect();
        };
    }, [searchTerm, filterStatus, yearFilter]);

    if (!events || !hotEvents) return <LoadingAdmin />


    const calculateStats = (events) => {

        const totalTicketsSold = events.reduce((sum, event) => {
            return sum + Number(event.ticketssold || 0);
        }, 0);

        const revenue = events.reduce((sum, event) => {
            return sum + Number(event.revenue || 0);
        }, 0);

        setStats({
            totalTicketsSold,
            revenue
        });
    };

    const calculateAllEvent = (events) => {

        const totalTicketsSold = events.reduce((sum, event) => {
            return sum + Number(event.ticketssold || 0);
        }, 0);

        const revenue = events.reduce((sum, event) => {
            return sum + Number(event.revenue || 0);
        }, 0);

        setStats({
            totalTicketsSold,
            revenue
        });
    };
    
    const getStatusBadge = (status) => {
        const statusConfig = {
            true: { label: 'Đang bán', class: 'bg-green-100 text-green-700' },
            false: { label: 'Đã kết thúc', class: 'bg-gray-100 text-gray-700' }, 
        };
        const config = statusConfig[status] || statusConfig.draft;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.class}`}>
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch =
            event.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.event_location?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === 'all' || event.status === filterStatus;

        const matchesYear =
            !yearFilter ||
            (event.event_start &&
            new Date(event.event_start).getFullYear() === Number(yearFilter));

        return matchesSearch && matchesStatus && matchesYear;
        });

    const visibleEvents = filteredEvents.slice(0, offset + LIMIT);

    const handleEditEvent = (eventId) => {
        navigate(`/admin/events/edit/${eventId}`);
        console.log('Chỉnh sửa sự kiện với ID:', eventId);
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/admin/events/${eventId}`, {
            method: 'DELETE'
            });

            if (response.ok) {
            setEvents(events.filter(e => e.event_id !== eventId));
            alert('Xóa sự kiện thành công!');
            }
        } catch (e) {
            alert('Lỗi khi xóa sự kiện: ' + e.message);
        }
        };


    if (loading) {
        return <LoadingAdmin />;
    }

    const statsCards = [
        { label: 'Tổng Sự Kiện', value: events.length, icon: Calendar, color: 'bg-blue-500' },
        { label: 'Đang Diễn Ra', value: hotEvents.length, icon: Users, color: 'bg-green-500' },
        { label: 'Vé Đã Bán', value: stats.totalTicketsSold, icon: Users, color: 'bg-purple-500' },
        { label: 'Doanh Thu', value: formatCurrency(stats.revenue), icon: DollarSign, color: 'bg-orange-500' }
    ];

    const handleChangeStatus = async (eventId, newStatus) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/events/${eventId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: newStatus }),
            });

            if (!res.ok) throw new Error("Cập nhật thất bại");

            console.log("Cập nhật trạng thái thành công!");
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                    Quản Lý Sự Kiện
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                    Quản lý và theo dõi tất cả các sự kiện đang diễn ra
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: '#dc2626',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Hot Events Banner */}
            {hotEvents.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '24px',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Flame size={24} />
                        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>🔥 Sự Kiện Hot - Đang Bán Chạy</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {hotEvents.map((event, index) => (
                            <div key={event.event_id} style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '15px', fontWeight: '600' }}>{event.event_name}</div>
                                    <div style={{ fontSize: '15px', fontWeight: '600' }}>Thể loại: {event.category_name}</div>
                                    <div style={{ 
                                        background: 'rgba(255, 255, 255, 0.3)',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '700'
                                    }}>
                                        #{index + 1}
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', opacity: '0.9', marginBottom: '12px' }}>
                                    <TrendingUp size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                    Đã bán {event.ticketssold} / {event.totaltickets} vé
                                </div>
                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    height: '6px',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        background: 'white',
                                        height: '100%',
                                        width: `${Math.min(
                                            (Number(event.ticketssold || 0) / Number(event.totaltickets || 1)) * 100,
                                            100
                                        )}%`,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {statsCards.map((stat, index) => (
                    <div key={index} style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }} className={stat.color}>
                            <stat.icon size={28} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                                {stat.label}
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                                {stat.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Actions */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sự kiện..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.3s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                        
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Filter size={18} color="#64748b" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">Tất cả</option>
                            <option value="active">Đang bán</option>
                            <option value="completed">Đã kết thúc</option>
                            <option value="draft">Nháp</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                        <input
                        type="number"
                        placeholder="Năm (vd: 2025)"
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        min="2025"
                        max="2100"
                        style={{
                            padding: '10px 16px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '14px',
                            width: '120px'
                        }}
                        />
                    </div>

                    <button 
                        onClick={() => navigate('/admin/events/add')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <Plus size={18} />
                        Tạo Sự Kiện Mới
                    </button>
                </div>
            </div>

            {/* Events List */}
            <div style={{ display: 'grid', gap: '20px' }}>
                {events.map((event) => (
                    <div key={event.id} style={{
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
                    >
                        <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
                            {event.image && (
                                <img 
                                    src={event.image} 
                                    alt={event.name}
                                    style={{
                                        width: '200px',
                                        height: '140px',
                                        objectFit: 'cover',
                                        borderRadius: '12px'
                                    }}
                                />
                            )}

                            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                            {event.event_name}
                                        </h3>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#64748b', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={16} />
                                                {(event.event_start).toString().slice(0,10).split("-").reverse().join("-")}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <MapPin size={16} />
                                                {event.event_location || 'Chưa có'}
                                            </span>
                                        </div>
                                        {getStatusBadge(event.event_status)}
                                    </div>
                                    <EventToggle
                                        initialStatus={event.event_status} 
                                        onChange={(newStatus) => {
                                            handleChangeStatus(event.event_id, newStatus);
                                        }}
                                    />
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Vé đã bán</span>
                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                            {event.ticketssold || 0} / {event.totaltickets || 0}
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(
                                                (Number(event.ticketssold || 0) / Number(event.totaltickets || 1)) * 100,
                                                100
                                            )}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #667eea, #764ba2)',
                                            transition: 'width 0.3s'
                                        }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '24px' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Doanh thu</div>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                                                {formatCurrency(event.revenue || 0)}
                                            </div>
                                        </div>
                                        {event.category && (
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Danh mục</div>
                                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                                    {event.category}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button style={{
                                            padding: '8px 12px',
                                            background: '#f1f5f9',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                                        onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
                                        >
                                            <Eye size={18} color="#64748b" />
                                        </button>
                                        <button 
                                            onClick={() => handleEditEvent(event.event_id)}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#f1f5f9',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                                            onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
                                        >
                                            <Edit2 size={18} color="#667eea" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteEvent(event.event_id)}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#fef2f2',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#fee2e2'}
                                            onMouseLeave={(e) => e.target.style.background = '#fef2f2'}
                                        >
                                            <Trash2 size={18} color="#ef4444" />
                                        </button>
                                    {filteredEvents.length > visibleEvents.length && (
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            marginTop: '32px' 
                                        }}>
                                            <button
                                                onClick={() => setOffset(offset + LIMIT)}
                                                style={{
                                                    padding: '14px 40px',
                                                    background: 'white',
                                                    border: '2px solid #667eea',
                                                    borderRadius: '12px',
                                                    color: '#667eea',
                                                    fontSize: '15px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s',
                                                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = '#667eea';
                                                    e.target.style.color = 'white';
                                                    e.target.style.transform = 'translateY(-2px)';
                                                    e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'white';
                                                    e.target.style.color = '#667eea';
                                                    e.target.style.transform = 'translateY(0)';
                                                    e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)';
                                                }}
                                            >
                                                Xem thêm {Math.min(LIMIT, filteredEvents.length - visibleEvents.length)} sự kiện
                                            </button>
                                        </div>
                                    )}    
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
            </div>

            {/* Empty State */}
            {filteredEvents.length === 0 && !loading && (
                <div style={{
                    background: 'white',
                    padding: '60px 20px',
                    borderRadius: '16px',
                    textAlign: 'center'
                }}>
                    <Calendar size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                        Không tìm thấy sự kiện
                    </h3>
                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {error ? 'Có lỗi xảy ra khi tải dữ liệu' : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'}
                    </p>
                    
                </div>
            )}
        </div>
    );
}