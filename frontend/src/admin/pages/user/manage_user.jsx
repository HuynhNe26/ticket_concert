import React, { useState, useEffect } from "react";
import LoadingAdmin from "../../components/loading/loading"; 
import { useAdminAuth } from "../../context/authAdmin"; 
import "./manage_user.css";

export default function UserManagement() {
    const { admin } = useAdminAuth(); 
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // --- STATE CHO XEM CHI TIẾT ---
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

    // --- HÀM LẤY CHI TIẾT USER ---
    const handleViewDetail = async (userId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await fetch(`http://localhost:5001/api/admin/users/${userId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedUser(data.data);
                setIsDetailModalOpen(true);
            }
        } catch (error) {
            console.error("Lỗi lấy chi tiết:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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

    return (
        <div className="admin-user-container">
            {loading && <LoadingAdmin />}

            {/* --- MODAL XEM CHI TIẾT --- */}
            {isDetailModalOpen && selectedUser && (
                <div className="modal-overlay">
                    <div className="modal-content detail-modal">
                        <div className="modal-header">
                            <h3>Chi Tiết Hội Viên</h3>
                            <button className="close-btn" onClick={() => setIsDetailModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body user-detail-grid">
                            <div className="detail-item"><strong>ID:</strong> #{selectedUser.user_id}</div>
                            <div className="detail-item"><strong>Họ Tên:</strong> {selectedUser.fullname}</div>
                            <div className="detail-item"><strong>Email:</strong> {selectedUser.email}</div>
                            <div className="detail-item"><strong>Số điện thoại:</strong> {selectedUser.phonenumber}</div>
                            <div className="detail-item"><strong>Giới tính:</strong> {selectedUser.gender}</div>
                            <div className="detail-item"><strong>Hạng:</strong> {selectedUser.membership}</div>
                            <div className="detail-item"><strong>Điểm tích lũy:</strong> {selectedUser.point}</div>
                            <div className="detail-item"><strong>Ngày tham gia:</strong> {formatDate(selectedUser.created_at)}</div>
                            <div className="detail-item"><strong>Trạng thái:</strong> {selectedUser.status}</div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsDetailModalOpen(false)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

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
                                <th>STT</th>
                                <th>Họ và Tên</th>
                                <th>Thông Tin Liên Hệ</th>
                                <th>Hạng Hội Viên</th>
                                <th>Ngày Tham Gia</th>
                                <th>Trạng Thái</th>
                                {admin?.level === 1 && <th>Thao Tác</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && users.length > 0 ? (
                                users.map((user, index) => (
                                    <tr key={user.user_id}>
                                        <td style={{fontWeight: 'bold', color: '#667eea'}}>{index + 1}</td>
                                        <td>
                                            <div style={{fontWeight: '600'}}>{user.fullname}</div>
                                            <div style={{fontSize: '12px', color: '#718096'}}>{user.gender}</div>
                                        </td>
                                        <td>
                                            <div style={{fontSize: '13px'}}>{user.email}</div>
                                            <div style={{fontSize: '12px', color: '#718096'}}>{user.phonenumber}</div>
                                        </td>
                                        <td>
                                            <span className={`membership-badge ${user.membership?.replace(/\s/g, '.')}`}>
                                                {user.membership}
                                            </span>
                                        </td>
                                        <td>{formatDate(user.created_at)}</td>
                                        <td>
                                            <div className={user.status !== 'Banned' ? "status-badge active-status" : "status-badge inactive-status"}>
                                                <span className="status-dot"></span>
                                                {user.status || 'Hoạt động'}
                                            </div>
                                        </td>
                                        {admin?.level === 1 && (
                                            <td>
                                                <button 
                                                    className="btn-action btn-view" 
                                                    onClick={() => handleViewDetail(user.user_id)}
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : !loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={admin?.level === 1 ? "7" : "6"} style={{textAlign: "center", padding: "40px", color: "#718096"}}>
                                        Không tìm thấy người dùng nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan={admin?.level === 1 ? "7" : "6"} style={{height: "200px"}}></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}