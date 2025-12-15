import React, { useState, useEffect } from "react";
import LoadingAdmin from "../../components/loading/loading"; 
import "./manage_user.css";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [memberships, setMemberships] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchUsers = async (keyword = "") => {
        setLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(`http://localhost:5001/api/admin/users?search=${keyword}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };

    const fetchMemberships = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch("http://localhost:5001/api/admin/memberships", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setMemberships(data.data.sort((a, b) => b.member_point - a.member_point));
            }
        } catch (error) {
            console.error("Error fetching memberships:", error);
        }
    };

    const getRankInfo = (point) => {
        if (!memberships || memberships.length === 0) return null;
        const rank = memberships.find(m => point >= m.member_point);
        return rank || memberships[memberships.length - 1];
    };

    useEffect(() => {
        fetchUsers();
        fetchMemberships(); 
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm !== "") {
                fetchUsers(searchTerm);
            }
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        if (e.target.value === "") {
            fetchUsers("");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const renderRankBadge = (point) => {
        const rank = getRankInfo(point);
        
        if (!rank) return <span className="membership-badge">Unrank</span>;
        const rankClass = rank.membership.replace(/\s/g, '.'); 

        return (
            <span className={`membership-badge ${rankClass}`}>
                {rank.membership}
            </span>
        );
    };

    return (
        <div className="admin-user-container">
            {loading && <LoadingAdmin />}

            <div className="user-card">
                <div className="user-header">
                    <div className="user-header-info">
                        <h2>Quản Lý Người Dùng</h2>
                        <p>Danh sách và thông tin hội viên</p>
                    </div>

                    <div className="search-wrapper">
                        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Tìm tên, email, sđt..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                <div className="user-body">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Họ và Tên</th>
                                <th>Thông Tin Liên Hệ</th>
                                <th>Hạng Hội Viên</th>
                                <th>Ngày Tham Gia</th>
                                <th>Trạng Thái</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.user_id}>
                                        <td style={{fontWeight: 'bold', color: '#667eea'}}>
                                            #{user.user_id}
                                        </td>
                                        <td>
                                            <div style={{fontWeight: '600'}}>{user.fullname}</div>
                                            <div style={{fontSize: '12px', color: '#718096'}}>{user.gender}</div>
                                        </td>
                                        <td>
                                            <div style={{fontSize: '13px'}}>{user.email}</div>
                                            <div style={{fontSize: '12px', color: '#718096'}}>{user.phonenumber}</div>
                                        </td>
                                        <td>
                                            {/* SỬ DỤNG LOGIC SO SÁNH ĐIỂM Ở ĐÂY */}
                                            {renderRankBadge(user.point)}
                                        </td>
                                        <td>{formatDate(user.created_at)}</td>
                                        <td>
                                            <div className={user.status !== 'Banned' ? "status-badge active-status" : "status-badge inactive-status"}>
                                                <span className="status-dot"></span>
                                                {user.status || 'Hoạt động'}
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn-action btn-edit" onClick={() => alert(`Sửa user ${user.user_id}`)}>
                                                Sửa
                                            </button>
                                            <button className="btn-action btn-delete" onClick={() => alert(`Xóa user ${user.user_id}`)}>
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : !loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{textAlign: "center", padding: "40px", color: "#718096"}}>
                                        Không tìm thấy người dùng nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{height: "200px"}}></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}