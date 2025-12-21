import { useAdminAuth } from "../../../context/authAdmin"
import LoadingAdmin from "../../../components/loading/loading"
import "./adminProfile.css"
import { useState } from "react"

export default function AdminProfile() {
    const { admin, loading } = useAdminAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState({})

    if (loading) {
        return <LoadingAdmin />
    }

    if (!admin) {
        return (
            <div className="no-admin">
                <p>Không tìm thấy thông tin quản trị viên</p>
            </div>
        )
    }

    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        const date = new Date(dateString)
        return date.toLocaleDateString('vi-VN')
    }

    const handleEdit = () => {
        setEditedData({
            fullName: admin.fullName || "",
            phoneNumber: admin.phoneNumber || "",
            address: admin.address || "",
            birthOfDay: admin.birthOfDay ? admin.birthOfDay.split('T')[0] : ""
        })
        setIsEditing(true)
    }

    const handleCancel = () => {
        setIsEditing(false)
        setEditedData({})
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setEditedData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSave = async () => {
        try {
            const token = localStorage.getItem("authToken")
            const response = await fetch("http://localhost:5000/api/admin/update-profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(editedData)
            })

            const data = await response.json()
            if (data.success) {
                alert("Cập nhật thông tin thành công!")
                setIsEditing(false)
                // Có thể reload lại trang hoặc cập nhật context
                window.location.reload()
            } else {
                alert("Cập nhật thất bại: " + data.message)
            }
        } catch (error) {
            console.error("Update error:", error)
            alert("Có lỗi xảy ra khi cập nhật")
        }
    }

    const getGenderText = (gender) => {
        if (gender === "male") return "Nam"
        if (gender === "female") return "Nữ"
        return "Khác"
    }

    const getRoleText = (role) => {
        if (role === "superadmin") return "Super Admin"
        if (role === "admin") return "Admin"
        if (role === "moderator") return "Moderator"
        return role
    }

    return (
        <div className="admin-profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar-section">
                        <div className="profile-avatar-large">
                            {admin.fullName?.charAt(0).toUpperCase() || "A"}
                        </div>
                        <div className="profile-header-info">
                            <h2>{admin.fullName || "Quản Trị Viên"}</h2>
                            <span className={`profile-role-badge ${admin.role?.toLowerCase()}`}>
                                {getRoleText(admin.role)}
                            </span>
                        </div>
                    </div>
                    {!isEditing && (
                        <button className="btn-edit-profile" onClick={handleEdit}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Chỉnh Sửa
                        </button>
                    )}
                </div>

                <div className="profile-body">
                    <div className="profile-section">
                        <h3 className="section-title">Thông Tin Cá Nhân</h3>
                        <div className="profile-grid">
                            <div className="profile-item">
                                <label>ID Quản Trị Viên</label>
                                <span className="value">{admin.admin_id || "N/A"}</span>
                            </div>

                            <div className="profile-item">
                                <label>Họ và Tên</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={editedData.fullname}
                                        onChange={handleChange}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{admin.fullName || "N/A"}</span>
                                )}
                            </div>

                            <div className="profile-item">
                                <label>Email</label>
                                <span className="value">{admin.email || "N/A"}</span>
                            </div>

                            <div className="profile-item">
                                <label>Số Điện Thoại</label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={editedData.phoneNumber}
                                        onChange={handleChange}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{admin.phonenumber || "N/A"}</span>
                                )}
                            </div>

                            <div className="profile-item">
                                <label>Ngày Sinh</label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        name="birthOfDay"
                                        value={editedData.birthOfDay}
                                        onChange={handleChange}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{formatDate(admin.birthofday)}</span>
                                )}
                            </div>

                            <div className="profile-item">
                                <label>Giới Tính</label>
                                <span className="value">{getGenderText(admin.gender)}</span>
                            </div>

                            <div className="profile-item full-width">
                                <label>Địa Chỉ</label>
                                {isEditing ? (
                                    <textarea
                                        name="address"
                                        value={editedData.address}
                                        onChange={handleChange}
                                        className="edit-textarea"
                                        rows="3"
                                    />
                                ) : (
                                    <span className="value">{admin.address || "N/A"}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3 className="section-title">Thông Tin Hệ Thống</h3>
                        <div className="profile-grid">
                            <div className="profile-item">
                                <label>Vai Trò</label>
                                <span className={`role-badge-inline ${admin.role?.toLowerCase()}`}>
                                    {getRoleText(admin.role)}
                                </span>
                            </div>

                            <div className="profile-item">
                                <label>Cấp Độ</label>
                                <span className="level-badge-inline">
                                    Cấp {admin.level || "N/A"}
                                </span>
                            </div>

                            <div className="profile-item">
                                <label>Ngày Tạo</label>
                                <span className="value">{formatDate(admin.created_at)}</span>
                            </div>

                            <div className="profile-item">
                                <label>Cập Nhật Lần Cuối</label>
                                <span className="value">{formatDate(admin.updatedat)}</span>
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="profile-actions">
                            <button className="btn-cancel" onClick={handleCancel}>
                                Hủy Bỏ
                            </button>
                            <button className="btn-save" onClick={handleSave}>
                                Lưu Thay Đổi
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}