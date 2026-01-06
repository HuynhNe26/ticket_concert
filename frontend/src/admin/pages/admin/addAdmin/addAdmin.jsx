import "./addAdmin.css"
import React, { useState } from "react"
import LoadingAdmin from "../../../components/loading/loading"
import SuccessInfo from "../../../components/notification/success/success"

const API_BASE = process.env.REACT_APP_API_URL;

export default function AddAdmin() {
    const [formData, setFormData] = useState({
        fullName: "",
        birthOfDay: "",
        email: "",
        phoneNumber: "",
        gender: "",
        address: "",
        level: "",
        role: ""
    })

    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}
        
        if (!formData.fullName.trim()) {
            newErrors.fullName = "Vui lòng nhập họ tên"
        }
        
        if (!formData.birthOfDay) {
            newErrors.birthOfDay = "Vui lòng chọn ngày sinh"
        }
        
        if (!formData.email.trim()) {
            newErrors.email = "Vui lòng nhập email"
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Email không hợp lệ"
        }
        
        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = "Vui lòng nhập số điện thoại"
        } else if (!/^[0-9]{10}$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = "Số điện thoại không hợp lệ"
        }
        
        if (!formData.gender) {
            newErrors.gender = "Vui lòng chọn giới tính"
        }
        
        if (!formData.address.trim()) {
            newErrors.address = "Vui lòng nhập địa chỉ"
        }
        
        if (!formData.level) {
            newErrors.level = "Vui lòng chọn cấp độ"
        }
        
        if (!formData.role) {
            newErrors.role = "Vui lòng chọn vai trò"
        }
        
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/admin/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                alert("Tạo tài khoản thành công!")

                setFormData({
                    fullName: "",
                    birthOfDay: "",
                    email: "",
                    phoneNumber: "",
                    gender: "",
                    address: "",
                    level: "",
                    role: ""
                });
            } else {
                setErrors({ api: data.message });
            }

        } catch (err) {
            console.error(err);
            setErrors({ api: "Không thể kết nối server" });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            fullName: "",
            birthOfDay: "",
            email: "",
            phoneNumber: "",
            gender: "",
            address: "",
            level: "",
            role: ""
        })
        setErrors({})
    }

    if (loading) {
        return <LoadingAdmin />
    }
    return (
        <div className="add-admin-container">
            <div className="add-admin-card">
                <h2 className="add-admin-title">Thêm Quản Trị Viên</h2>
                
                <form onSubmit={handleSubmit} className="add-admin-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="fullName">Họ và Tên <span className="required">*</span></label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={errors.fullName ? "error" : ""}
                                placeholder="Nhập họ và tên"
                            />
                            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                        </div>

                        <div className="form-group">
                            <label className="birthOfDay">Ngày Sinh <span className="required">*</span></label>
                            <input
                                type="date"
                                id="birthOfDay"
                                name="birthOfDay"
                                value={formData.birthOfDay}
                                onChange={handleChange}
                                className={errors.birthOfDay ? "error" : ""}
                            />
                            {errors.birthOfDay && <span className="error-message">{errors.birthOfDay}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="email">Email <span className="required">*</span></label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? "error" : ""}
                                placeholder="example@email.com"
                            />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label className="phoneNumber">Số Điện Thoại <span className="required">*</span></label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className={errors.phoneNumber ? "error" : ""}
                                placeholder="0123456789"
                            />
                            {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="gender">Giới Tính <span className="required">*</span></label>
                            <select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className={errors.gender ? "error" : ""}
                            >
                                <option value="">Chọn giới tính</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                            </select>
                            {errors.gender && <span className="error-message">{errors.gender}</span>}
                        </div>
                    </div>

                    <div className="form-group full-width">
                        <label className="address">Địa Chỉ <span className="required">*</span></label>
                        <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className={errors.address ? "error" : ""}
                            placeholder="Nhập địa chỉ đầy đủ"
                            rows="3"
                        />
                        {errors.address && <span className="error-message">{errors.address}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="level">Cấp Độ <span className="required">*</span></label>
                            <select
                                id="level"
                                name="level"
                                value={formData.level}
                                onChange={handleChange}
                                className={errors.level ? "error" : ""}
                            >
                                <option value="">Chọn cấp độ</option>
                                <option value="1">Cấp 1</option>
                                <option value="2">Cấp 2</option>
                            </select>
                            {errors.level && <span className="error-message">{errors.level}</span>}
                        </div>

                        <div className="form-group">
                            <label className="role">Vai Trò <span className="required">*</span></label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={errors.role ? "error" : ""}
                            >
                                <option value="">Chọn vai trò</option>
                                <option value="superadmin">Quản trị viên cấp cao</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                            {errors.role && <span className="error-message">{errors.role}</span>}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={handleReset} className="btn-reset">
                            Đặt Lại
                        </button>
                        <button type="submit" className="btn-submit">
                            Thêm Quản Trị Viên
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}