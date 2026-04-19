import React, { useState, useEffect } from "react"
import LoadingAdmin from "../../../components/loading/loading"
import "./manageAdmin.css"
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL;

const API = {
    getAll:    ()   => `${API_BASE}/api/admin/auth/`,
    search:    (q)  => `${API_BASE}/api/admin/auth/search?admin=${encodeURIComponent(q)}`,
    resetPass: (id) => `${API_BASE}/api/admin/auth/resetPass/${id}`,
    update:    (id) => `${API_BASE}/api/admin/auth/update/${id}`,
    delete:    (id) => `${API_BASE}/api/admin/auth/${id}`,
}

const EMPTY_FORM = {
    fullname: "", email: "", phonenumber: "",
    birthofday: "", gender: "", role: "", level: "", address: ""
}

export default function ManageAdmin() {
    const [admin, setAdmin]               = useState([])
    const [loading, setLoading]           = useState(true)
    const [selectedAdmin, setSelectedAdmin] = useState(null)
    const [showModal, setShowModal]       = useState(false)
    const [search, setSearch]             = useState("")
    const [toast, setToast]               = useState(null)

    const [showEditModal, setShowEditModal]   = useState(false)
    const [editForm, setEditForm]             = useState(EMPTY_FORM)
    const [editLoading, setEditLoading]       = useState(false)
    const [editErrors, setEditErrors]         = useState({})

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteTarget, setDeleteTarget]           = useState(null)
    const [deleteLoading, setDeleteLoading]         = useState(false)
    const navigate = useNavigate();

    const showToast = (message, type = "success") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        const getAllAdmin = async () => {
            try {
                const res  = await fetch(API.getAll(), {
                    method: 'GET',
                    headers: { 'Content-type': 'application/json' }
                })
                const data = await res.json()
                if (data.success) setAdmin(data.admin)
            } catch (err) {
                console.error(err)
                showToast("Không thể tải danh sách quản trị viên", "error")
            } finally {
                setLoading(false)
            }
        }
        getAllAdmin()
    }, [])

    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString('vi-VN')
    }

    const toInputDate = (dateString) => {
        if (!dateString) return ""
        const d = new Date(dateString)
        if (isNaN(d)) return ""
        return d.toISOString().split('T')[0]
    }

    const getInitial   = (name) => name?.trim()?.charAt(0)?.toUpperCase() ?? "A"
    const getRoleColor = (role) => {
        const map = { superadmin: "role-super", admin: "role-admin", moderator: "role-mod" }
        return map[role?.toLowerCase()] ?? "role-default"
    }

    const handleViewDetail = (adminData) => { setSelectedAdmin(adminData); setShowModal(true) }
    const handleCloseModal = () => { setShowModal(false); setSelectedAdmin(null) }

    const handleSetPass = async (id) => {
        if (!id) { showToast("Không tìm thấy ID", "error"); return }
        setLoading(true)
        try {
            const res  = await fetch(API.resetPass(id), { method: 'PUT', headers: { 'Content-type': 'application/json' } })
            const data = await res.json()
            if (data.success) { showToast("Đặt lại mật khẩu thành công!"); handleCloseModal() }
            else showToast(data.message || "Đặt lại mật khẩu thất bại", "error")
        } catch { showToast("Lỗi kết nối máy chủ", "error") }
        finally  { setLoading(false) }
    }


    const handleSearch = async () => {
        setLoading(true)
        try {
            const res  = await fetch(API.search(search))
            const data = await res.json()
            if (data.success) setAdmin(data.data)
            else showToast("Không tìm thấy kết quả", "error")
        } catch { showToast("Lỗi tìm kiếm", "error") }
        finally  { setLoading(false) }
    }

    const openEditModal = (adminData) => {
        setEditForm({
            fullname:    adminData.fullname    ?? "",
            email:       adminData.email       ?? "",
            phonenumber: adminData.phonenumber ?? "",
            birthofday:  toInputDate(adminData.birthofday),
            gender:      adminData.gender      ?? "",
            role:        adminData.role        ?? "",
            level:       adminData.level       ?? "",
            address:     adminData.address     ?? "",
        })
        setEditErrors({})
        setSelectedAdmin(adminData)
        setShowModal(false)
        setShowEditModal(true)
    }

    const closeEditModal = () => {
        setShowEditModal(false)
        setEditForm(EMPTY_FORM)
        setEditErrors({})
        setSelectedAdmin(null)
    }

    const validateEdit = () => {
        const errs = {}
        if (!editForm.fullname.trim())    errs.fullname    = "Họ tên không được trống"
        if (!editForm.email.trim())       errs.email       = "Email không được trống"
        else if (!/\S+@\S+\.\S+/.test(editForm.email)) errs.email = "Email không hợp lệ"
        if (!editForm.phonenumber.trim()) errs.phonenumber = "Số điện thoại không được trống"
        if (!editForm.role)               errs.role        = "Vui lòng chọn vai trò"
        return errs
    }

    const handleEditChange = (e) => {
        const { name, value } = e.target
        setEditForm(prev => ({ ...prev, [name]: value }))
        if (editErrors[name]) setEditErrors(prev => ({ ...prev, [name]: "" }))
    }

    const handleEditSubmit = async () => {
        const errs = validateEdit()
        if (Object.keys(errs).length) { setEditErrors(errs); return }
        setEditLoading(true)
        console.log(editForm)
        try {
            const res  = await fetch(API.update(selectedAdmin.admin_id), {
                method: 'PUT',
                headers: { 'Content-type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (data.success) {
                setAdmin(prev => prev.map(a => a.admin_id === selectedAdmin.admin_id ? { ...a, ...editForm } : a))
                showToast("Cập nhật thông tin thành công!")
                closeEditModal()
            } else {
                showToast(data.message || "Cập nhật thất bại", "error")
            }
        } catch { showToast("Lỗi kết nối máy chủ", "error") }
        finally  { setEditLoading(false) }
    }

    const openDeleteConfirm = (adminData) => {
        setDeleteTarget(adminData)
        setShowModal(false)
        setShowDeleteConfirm(true)
    }

    const closeDeleteConfirm = () => { setShowDeleteConfirm(false); setDeleteTarget(null) }

    const handleDelete = async () => {
        if (!deleteTarget?.admin_id) { showToast("Không tìm thấy ID", "error"); return }
        setDeleteLoading(true)
        try {
            const res  = await fetch(API.delete(deleteTarget.admin_id), {
                method: 'DELETE',
                headers: { 'Content-type': 'application/json' }
            })
            const data = await res.json()
            if (data.success) {
                setAdmin(prev => prev.filter(a => a.admin_id !== deleteTarget.admin_id))
                showToast(`Đã xóa quản trị viên "${deleteTarget.fullname}"`)
                closeDeleteConfirm()
            } else {
                showToast(data.message || "Xóa thất bại", "error")
            }
        } catch { showToast("Lỗi kết nối máy chủ", "error") }
        finally  { setDeleteLoading(false) }
    }

    if (loading) return <LoadingAdmin />

    return (
        <div className="ma-container">

            {/* Toast */}
            {toast && (
                <div className={`ma-toast ma-toast--${toast.type}`}>
                    <span className="ma-toast__icon">{toast.type === 'success' ? '✓' : '✕'}</span>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="ma-header">
                <div className="ma-header__left">
                    <div>
                        <h1 className="ma-title">Quản Lý Quản Trị Viên</h1>
                    </div>
                </div>
                <button className="ma-btn-add" onClick={() => navigate("/admin/add")}>+ Thêm mới</button>
            </div>

            {/* Search */}
            <div className="ma-search-bar">
                <div className="ma-search-input-wrap">
                    <span className="ma-search-icon">⌕</span>
                    <input
                        className="ma-search-input"
                        placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    {search && <button className="ma-search-clear" onClick={() => setSearch("")}>×</button>}
                </div>
                <button className="ma-btn-search" onClick={handleSearch}>Tìm kiếm</button>
            </div>

            {/* Table */}
            <div className="ma-table-card">
                <div className="ma-table-scroll">
                    <table className="ma-table">
                        <thead>
                            <tr>
                                <th>#</th><th>Quản Trị Viên</th><th>Email</th>
                                <th>Số Điện Thoại</th><th>Vai Trò</th><th>Cấp Độ</th><th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admin.length > 0 ? admin.map((item, index) => (
                                <tr key={item._id ?? index} className="ma-table__row">
                                    <td className="ma-td-num">{index + 1}</td>
                                    <td>
                                        <div className="ma-person">
                                            <div className={`ma-avatar ma-avatar--${(index % 5) + 1}`}>
                                                {getInitial(item.fullname)}
                                            </div>
                                            <span className="ma-person__name">{item.fullname ?? "N/A"}</span>
                                        </div>
                                    </td>
                                    <td className="ma-td-muted">{item.email ?? "N/A"}</td>
                                    <td className="ma-td-muted">{item.phonenumber ?? "N/A"}</td>
                                    <td>
                                        <span className={`ma-role-badge ${getRoleColor(item.role)}`}>
                                            {item.role == "superadmin" ? "Quản trị viên cấp cao" : "Nhân viên soát vé"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="ma-level-badge">Cấp {item.level ?? "?"}</span>
                                    </td>
                                    <td>
                                        <div className="ma-action-group">
                                            <button className="ma-btn-detail" onClick={() => handleViewDetail(item)}>Chi tiết</button>
                                            <button className="ma-btn-icon ma-btn-icon--edit" title="Chỉnh sửa" onClick={() => openEditModal(item)}>✏</button>
                                            <button className="ma-btn-icon ma-btn-icon--del"  title="Xóa"       onClick={() => openDeleteConfirm(item)}>🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="ma-empty">
                                        <div className="ma-empty__icon">👤</div>
                                        <p>Không có dữ liệu quản trị viên</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── DETAIL MODAL ── */}
            {showModal && selectedAdmin && (
                <div className="ma-modal-overlay" onClick={handleCloseModal}>
                    <div className="ma-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ma-modal__header">
                            <h3 className="ma-modal__title">Chi Tiết Quản Trị Viên</h3>
                            <button className="ma-modal__close" onClick={handleCloseModal}>×</button>
                        </div>
                        <div className="ma-modal__body">
                            <div className="ma-modal__avatar-wrap">
                                <div className="ma-modal__avatar">{getInitial(selectedAdmin.fullname)}</div>
                                <div className="ma-modal__avatar-info">
                                    <p className="ma-modal__name">{selectedAdmin.fullname ?? "N/A"}</p>
                                    <span className={`ma-role-badge ${getRoleColor(selectedAdmin.role)}`}>{selectedAdmin.role ?? "N/A"}</span>
                                </div>
                            </div>
                            <div className="ma-detail-grid">
                                {[
                                    { label: "Email",         value: selectedAdmin.email },
                                    { label: "Số Điện Thoại", value: selectedAdmin.phonenumber },
                                    { label: "Ngày Sinh",     value: formatDate(selectedAdmin.birthofday) },
                                    { label: "Giới Tính",     value: selectedAdmin.gender },
                                    { label: "Cấp Độ",        value: `Cấp ${selectedAdmin.level ?? "N/A"}` },
                                ].map(({ label, value }) => (
                                    <div className="ma-detail-item" key={label}>
                                        <span className="ma-detail-label">{label}</span>
                                        <span className="ma-detail-value">{value ?? "N/A"}</span>
                                    </div>
                                ))}
                                <div className="ma-detail-item ma-detail-item--full">
                                    <span className="ma-detail-label">Địa Chỉ</span>
                                    <span className="ma-detail-value">{selectedAdmin.address ?? "N/A"}</span>
                                </div>
                            </div>
                        </div>
                        <div className="ma-modal__footer">
                            <button className="ma-btn ma-btn--ghost"    onClick={() => handleSetPass(selectedAdmin.admin_id)}>🔑 Đặt lại mật khẩu</button>
                            <button className="ma-btn ma-btn--primary"  onClick={() => openEditModal(selectedAdmin)}>✏ Chỉnh Sửa</button>
                            <button className="ma-btn ma-btn--danger"   onClick={() => openDeleteConfirm(selectedAdmin)}>🗑 Xóa</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {showEditModal && selectedAdmin && (
                <div className="ma-modal-overlay" onClick={closeEditModal}>
                    <div className="ma-modal ma-modal--wide" onClick={(e) => e.stopPropagation()}>
                        <div className="ma-modal__header">
                            <h3 className="ma-modal__title">✏ Chỉnh Sửa Quản Trị Viên</h3>
                            <button className="ma-modal__close" onClick={closeEditModal}>×</button>
                        </div>
                        <div className="ma-modal__body">
                            <div className="ma-form-grid">

                                <div className={`ma-form-field ${editErrors.fullname ? 'ma-form-field--error' : ''}`}>
                                    <label className="ma-form-label">Họ và Tên <span className="ma-req">*</span></label>
                                    <input className="ma-form-input" name="fullname" value={editForm.fullname} onChange={handleEditChange} placeholder="Nguyễn Văn A" />
                                    {editErrors.fullname && <span className="ma-form-err">{editErrors.fullname}</span>}
                                </div>

                                <div className={`ma-form-field ${editErrors.email ? 'ma-form-field--error' : ''}`}>
                                    <label className="ma-form-label">Email <span className="ma-req">*</span></label>
                                    <input className="ma-form-input" name="email" type="email" value={editForm.email} onChange={handleEditChange} placeholder="admin@example.com" />
                                    {editErrors.email && <span className="ma-form-err">{editErrors.email}</span>}
                                </div>

                                <div className={`ma-form-field ${editErrors.phonenumber ? 'ma-form-field--error' : ''}`}>
                                    <label className="ma-form-label">Số Điện Thoại <span className="ma-req">*</span></label>
                                    <input className="ma-form-input" name="phonenumber" value={editForm.phonenumber} onChange={handleEditChange} placeholder="0901234567" />
                                    {editErrors.phonenumber && <span className="ma-form-err">{editErrors.phonenumber}</span>}
                                </div>

                                <div className="ma-form-field">
                                    <label className="ma-form-label">Ngày Sinh</label>
                                    <input className="ma-form-input" name="birthofday" type="date" value={editForm.birthofday} onChange={handleEditChange} />
                                </div>

                                <div className="ma-form-field">
                                    <label className="ma-form-label">Giới Tính</label>
                                    <select className="ma-form-input" name="gender" value={editForm.gender} onChange={handleEditChange}>
                                        <option value="">-- Chọn --</option>
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>

                                <div className={`ma-form-field ${editErrors.role ? 'ma-form-field--error' : ''}`}>
                                    <label className="ma-form-label">Vai Trò <span className="ma-req">*</span></label>
                                    <select className="ma-form-input" name="role" value={editForm.role} onChange={handleEditChange}>
                                        <option value="">-- Chọn --</option>
                                        <option value="supperadmin">Quản trị viên cấp cao</option>
                                        <option value="admin">Nhân viên soát vé</option>
                                    </select>
                                    {editErrors.role && <span className="ma-form-err">{editErrors.role}</span>}
                                </div>

                                <div className="ma-form-field">
                                    <label className="ma-form-label">Cấp Độ</label>
                                    <input className="ma-form-input" name="level" type="number" min="1" value={editForm.level} onChange={handleEditChange} placeholder="1" />
                                </div>

                                <div className="ma-form-field ma-form-field--full">
                                    <label className="ma-form-label">Địa Chỉ</label>
                                    <input className="ma-form-input" name="address" value={editForm.address} onChange={handleEditChange} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
                                </div>
                            </div>
                        </div>
                        <div className="ma-modal__footer">
                            <button className="ma-btn ma-btn--ghost" onClick={closeEditModal} disabled={editLoading}>Hủy</button>
                            <button className="ma-btn ma-btn--primary" onClick={handleEditSubmit} disabled={editLoading}>
                                {editLoading ? <span className="ma-spinner" /> : "💾 Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM ── */}
            {showDeleteConfirm && deleteTarget && (
                <div className="ma-modal-overlay" onClick={closeDeleteConfirm}>
                    <div className="ma-modal ma-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="ma-modal__header">
                            <h3 className="ma-modal__title">Xác Nhận Xóa</h3>
                            <button className="ma-modal__close" onClick={closeDeleteConfirm}>×</button>
                        </div>
                        <div className="ma-modal__body">
                            <div className="ma-delete-confirm">
                                <div className="ma-delete-icon">🗑</div>
                                <p className="ma-delete-msg">Bạn có chắc muốn xóa quản trị viên</p>
                                <p className="ma-delete-name">"{deleteTarget.fullname}"?</p>
                                <p className="ma-delete-warn">Hành động này không thể hoàn tác.</p>
                            </div>
                        </div>
                        <div className="ma-modal__footer">
                            <button className="ma-btn ma-btn--ghost" onClick={closeDeleteConfirm} disabled={deleteLoading}>Hủy bỏ</button>
                            <button className="ma-btn ma-btn--danger-solid" onClick={handleDelete} disabled={deleteLoading}>
                                {deleteLoading ? <span className="ma-spinner" /> : "🗑 Xác nhận xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}