import { useAdminAuth } from "../../../context/authAdmin"
import LoadingAdmin from "../../../components/loading/loading"
import "./adminProfile.css"
import { useState } from "react"

const API_BASE = process.env.REACT_APP_API_URL;

export default function AdminProfile() {
    const { admin, loading } = useAdminAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState({})

    // State đổi mật khẩu
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })
    const [passwordError, setPasswordError] = useState("")
    const [passwordSuccess, setPasswordSuccess] = useState("")
    const [passwordLoading, setPasswordLoading] = useState(false)

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
            fullname: admin.fullname || "",
            phonenumber: admin.phonenumber || "",
            address: admin.address || "",
            birthofday: admin.birthofday ? admin.birthofday.split('T')[0] : ""
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
            const response = await fetch(`${API_BASE}/api/admin/auth/update-profile`, {
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
                window.location.reload()
            } else {
                alert("Cập nhật thất bại: " + data.message)
            }
        } catch (error) {
            console.error("Update error:", error)
            alert("Có lỗi xảy ra khi cập nhật")
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        setPasswordError("")
        setPasswordSuccess("")

        if (!passwordForm.currentPassword) {
            setPasswordError("Vui lòng nhập mật khẩu hiện tại!")
            return
        }

        if (!passwordForm.newPassword) {
            setPasswordError("Vui lòng nhập mật khẩu mới!")
            return
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự!")
            return
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("Mật khẩu xác nhận không khớp!")
            return
        }

        setPasswordLoading(true)
        try {
            const token = localStorage.getItem("authToken")
            const response = await fetch(`${API_BASE}/api/admin/auth/change-password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            })

            const data = await response.json()
            if (data.success) {
                setPasswordSuccess(data.message || "Đổi mật khẩu thành công!")
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                setTimeout(() => {
                    setShowPasswordModal(false)
                    setPasswordSuccess("")
                }, 1500)
            } else {
                setPasswordError(data.message || "Đổi mật khẩu thất bại!")
            }
        } catch (err) {
            setPasswordError("Lỗi kết nối máy chủ!")
        } finally {
            setPasswordLoading(false)
        }
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
                            {admin.fullname?.charAt(0).toUpperCase() || "A"}
                        </div>
                        <div className="profile-header-info">
                            <h2>{admin.fullname || "Quản Trị Viên"}</h2>
                            <span className={`profile-role-badge ${admin.role?.toLowerCase()}`}>
                                {getRoleText(admin.role)}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {!isEditing && (
                            <>
                                <button
                                    className="btn-edit-profile"
                                    onClick={() => {
                                        setPasswordError("")
                                        setPasswordSuccess("")
                                        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                                        setShowPasswordModal(true)
                                    }}
                                    style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    Đổi Mật Khẩu
                                </button>
                                <button className="btn-edit-profile" onClick={handleEdit}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Chỉnh Sửa
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="profile-body">
                    <div className="profile-section">
                        <h3 className="section-title">Thông Tin Cá Nhân</h3>
                        <div className="profile-grid">

                            <div className="profile-item">
                                <label>Họ và Tên</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="fullname"
                                        value={editedData.fullname}
                                        onChange={handleChange}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{admin.fullname || "N/A"}</span>
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
                                        name="phonenumber"
                                        value={editedData.phonenumber}
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
                                        name="birthofday"
                                        value={editedData.birthofday}
                                        onChange={handleChange}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{formatDate(admin.birthofday)}</span>
                                )}
                            </div>

                            <div className="profile-item">
                                <label>Giới Tính</label>
                                <span className="value">{admin.gender}</span>
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
                                <span className="value">{formatDate(admin.updated_at)}</span>
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

            {/* Modal Đổi Mật Khẩu */}
            {showPasswordModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "16px"
                    }}
                    onClick={() => setShowPasswordModal(false)}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "16px",
                            padding: "28px",
                            maxWidth: "420px",
                            width: "100%",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                            color: "#1e293b",
                            position: "relative"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>
                            Đổi Mật Khẩu Quản Trị
                        </h3>
                        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>
                            Mật khẩu sẽ được mã hóa an toàn bằng thuật toán bcrypt.
                        </p>

                        {passwordError && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#fef2f2",
                                color: "#ef4444",
                                borderRadius: "8px",
                                fontSize: "13px",
                                marginBottom: "14px",
                                border: "1px solid #fee2e2"
                            }}>
                                ⚠️ {passwordError}
                            </div>
                        )}

                        {passwordSuccess && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#f0fdf4",
                                color: "#16a34a",
                                borderRadius: "8px",
                                fontSize: "13px",
                                marginBottom: "14px",
                                border: "1px solid #dcfce7"
                            }}>
                                ✅ {passwordSuccess}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                                    Mật khẩu hiện tại <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Nhập mật khẩu đang dùng"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                                    Mật khẩu mới <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Tối thiểu 6 ký tự"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#334155" }}>
                                    Xác nhận mật khẩu mới <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                    placeholder="Nhập lại mật khẩu mới"
                                    required
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    style={{
                                        padding: "10px 18px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        background: "#f1f5f9",
                                        color: "#475569",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                    }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        color: "#ffffff",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: passwordLoading ? "not-allowed" : "pointer",
                                        opacity: passwordLoading ? 0.7 : 1
                                    }}
                                >
                                    {passwordLoading ? "Đang xử lý..." : "Lưu Mật Khẩu"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}