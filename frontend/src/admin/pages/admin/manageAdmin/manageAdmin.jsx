import LoadingAdmin from "../../../components/loading/loading"
import "./manageAdmin.css"
import React, {useState, useEffect} from "react"

export default function ManageAdmin() {
    const [admin, setAdmin] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedAdmin, setSelectedAdmin] = useState(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        const getAllAdmin = async () => {
            try {
                const response = await fetch("http://localhost:5001/api/admin/", {
                    method: 'GET',
                    headers: {
                        'Content-type': 'application/json'
                    }
                })

                const data = await response.json()
                if (data.success) {
                    setAdmin(data.admin)
                }
            } catch (err) {
                console.log(err.message)
            } finally {
                setLoading(false)
            }
        }

        getAllAdmin()
    }, [])

    const handleViewDetail = (adminData) => {
        setSelectedAdmin(adminData)
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setSelectedAdmin(null)
    }

    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        const date = new Date(dateString)
        return date.toLocaleDateString('vi-VN')
    }

    const handleSetPass = async (id) => {
        setLoading(true)
        try {
            const response = await fetch(`http://localhost:5001/api/admin/resetPass/${id}`, {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json'
                }
            })

            const data = await response.json()
            if (data.success) {
                
            }
        } catch (err) {

        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <LoadingAdmin />
    }

    return (
        <div className="manage-admin-container">
            <div className="manage-admin-header">
                <h2>Quản Lý Quản Trị Viên</h2>
            </div>

            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Họ và Tên</th>
                            <th>Email</th>
                            <th>Số Điện Thoại</th>
                            <th>Vai Trò</th>
                            <th>Cấp Độ</th>
                            <th>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admin.length > 0 ? (
                            admin.map((item, index) => (
                                <tr key={item._id || index}>
                                    <td>{index + 1}</td>
                                    <td className="admin-name">
                                        <div className="name-avatar">
                                            <div className="avatar">
                                                {item.fullname?.charAt(0).toUpperCase() || "A"}
                                            </div>
                                            <span>{item.fullname || "N/A"}</span>
                                        </div>
                                    </td>
                                    <td>{item.email || "N/A"}</td>
                                    <td>{item.phoneNumber || "N/A"}</td>
                                    <td>
                                        <span className={`role-badge ${item.role?.toLowerCase()}`}>
                                            {item.role || "N/A"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="level-badge">
                                            Cấp {item.level || "N/A"}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-detail"
                                            onClick={() => handleViewDetail(item)}
                                        >
                                            Xem Chi Tiết
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="no-data">
                                    Không có dữ liệu quản trị viên
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && selectedAdmin && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Chi Tiết Quản Trị Viên</h3>
                            <button className="btn-close" onClick={handleCloseModal}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-avatar">
                                <div className="avatar-large">
                                    {selectedAdmin.fullname?.charAt(0).toUpperCase() || "A"}
                                </div>
                            </div>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Họ và Tên:</label>
                                    <span>{selectedAdmin.fullname || "N/A"}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Email:</label>
                                    <span>{selectedAdmin.email || "N/A"}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Số Điện Thoại:</label>
                                    <span>{selectedAdmin.phonenumber || "N/A"}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Ngày Sinh:</label>
                                    <span>{formatDate(selectedAdmin.birthofday)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Giới Tính:</label>
                                    <span>{selectedAdmin.gender}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Vai Trò:</label>
                                    <span className={`role-badge ${selectedAdmin.role?.toLowerCase()}`}>
                                        {selectedAdmin.role || "N/A"}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Cấp Độ:</label>
                                    <span className="level-badge">Cấp {selectedAdmin.level || "N/A"}</span>
                                </div>
                                <div className="detail-item full-width">
                                    <label>Địa Chỉ:</label>
                                    <span>{selectedAdmin.address || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-edit">Đặt lại mật khẩu</button>
                            <button className="btn-edit">Chỉnh Sửa</button>
                            <button className="btn-delete">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}