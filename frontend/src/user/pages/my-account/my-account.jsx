import React, { useState, useRef, useEffect } from "react";
import "./my-account.css";
import LoadingUser from "../../components/loading/loading";

const API_BASE = process.env.REACT_APP_API_URL;

function dateToTimestamp(day, month, year) {
    if (!day || !month || !year) return null;
    return `${year}-${month}-${day}`;
}

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - i));

export default function MyAccount() {
    const [info, setInfo] = useState({
        fullname: "",
        phonenumber: "",
        gender: "",
        birthofday: null, 
    });

    const [dob, setDob] = useState({ day: "", month: "", year: "" });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    const [avatarPreview, setAvatarPreview] = useState(null);
    const token = localStorage.getItem("token");
    const fileInputRef = useRef(null);

    useEffect(() => {
        const getInfo = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/users/profile`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                if (data.success) {
                    const user = data.data[0];
                    setInfo(user);
                    if (user.birthofday) {
                        const parseDob = (dateStr) => {
                            
                            const [year, month, day] = dateStr.split("T")[0].split("-");
                            
                            return {
                                day: String(day), 
                                month: String(month), 
                                year,
                            };
                        };

                        setDob(parseDob(user.birthofday));
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        getInfo();
    }, []);

    if (loading) return <LoadingUser />;

    const handleChange = (field, value) => {
        setInfo((prev) => ({ ...prev, [field]: value }));
    };

    const handleDobChange = (field, value) => {
        const next = { ...dob, [field]: value };
        setDob(next);
        const ts = dateToTimestamp(next.day, next.month, next.year);
        setInfo((prev) => ({ ...prev, birthofday: ts }));
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        setSaving(true);
        setSaveMsg("");
        try {
            const payload = {
                fullname: info.fullname,
                phonenumber: info.phonenumber,
                gender: info.gender,
                birthofday: info.birthofday, 
            };

            const res = await fetch(`${API_BASE}/api/users/change-profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            setSaveMsg(data.success ? "✓ Lưu thành công!" : `✗ ${data.message || "Có lỗi xảy ra."}`);
        } catch (err) {
            setSaveMsg("✗ Không thể kết nối đến máy chủ.");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(""), 3000);
        }
    };

    const getInitial = () => info.fullname?.trim().charAt(0).toUpperCase() || "?";

    return (
        <div className="ma-page">
            <div className="ma-container">
                <div className="ma-header">
                    <h1 className="ma-title">Thông tin tài khoản</h1>
                    <div className="ma-divider" />
                </div>

                <div className="ma-body">
                    {/* Avatar */}
                    <div className="ma-avatar-wrapper" onClick={handleAvatarClick}>
                        <div className="ma-avatar">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="avatar" className="ma-avatar-img" />
                            ) : (
                                <span className="ma-avatar-initial">{getInitial()}</span>
                            )}
                        </div>
                        <div className="ma-avatar-camera">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="ma-file-input" onChange={handleAvatarChange} />
                    </div>

                    <p className="ma-notice">
                        Cung cấp thông tin chính xác sẽ hỗ trợ bạn trong
                        <br />
                        quá trình mua vé, hoặc khi cần xác thực vé
                    </p>

                    <div className="ma-form">
                        {/* Full Name */}
                        <div className="ma-field">
                            <label className="ma-label">Họ và tên</label>
                            <input
                                className="ma-input"
                                type="text"
                                value={info.fullname || ""}
                                onChange={(e) => handleChange("fullname", e.target.value)}
                            />
                        </div>

                        {/* Phone */}
                        <div className="ma-field">
                            <label className="ma-label">Số điện thoại</label>
                            <div className="ma-phone-input-wrapper">
                                <input
                                    className="ma-input ma-phone-input"
                                    type="tel"
                                    value={info.phonenumber || ""}
                                    onChange={(e) => handleChange("phonenumber", e.target.value)}
                                />
                                {info.phonenumber && (
                                    <button className="ma-clear-btn" onClick={() => handleChange("phonenumber", "")} type="button">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="ma-field">
                            <label className="ma-label ma-label--muted">Email</label>
                            <div className="ma-email-wrapper">
                                <input
                                    className="ma-input ma-email-input"
                                    type="email"
                                    value={info.email || ""}
                                    disabled
                                />
                                <span className="ma-verified-icon">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="#22c55e" />
                                        <polyline points="8 12 11 15 16 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </div>
                        </div>

                        {/* DOB — 3 dropdowns: Ngày / Tháng / Năm */}
                        <div className="ma-field">
                            <label className="ma-label">Ngày tháng năm sinh</label>
                            <div className="ma-dob-row">
                                <div className="ma-select-wrapper">
                                    <select className="ma-select" value={dob.day} onChange={(e) => handleDobChange("day", e.target.value)}>
                                        <option value="">Ngày</option>
                                        {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <svg className="ma-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                                <div className="ma-select-wrapper">
                                    <select className="ma-select" value={dob.month} onChange={(e) => handleDobChange("month", e.target.value)}>
                                        <option value="">Tháng</option>
                                        {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
                                    </select>
                                    <svg className="ma-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                                <div className="ma-select-wrapper">
                                    <select className="ma-select" value={dob.year} onChange={(e) => handleDobChange("year", e.target.value)}>
                                        <option value="">Năm</option>
                                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <svg className="ma-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Gender */}
                        <div className="ma-field">
                            <label className="ma-label">Giới tính</label>
                            <div className="ma-gender-row">
                                {[{ value: "Nam", label: "Nam" }, { value: "Nữ", label: "Nữ" }, { value: "Khác", label: "Khác" }].map((opt) => (
                                    <label key={opt.value} className="ma-radio-label">
                                        <div
                                            className={`ma-radio ${info.gender === opt.value ? "ma-radio--checked" : ""}`}
                                            onClick={() => handleChange("gender", opt.value)}
                                        >
                                            {info.gender === opt.value && <div className="ma-radio-dot" />}
                                        </div>
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Save message */}
                        {saveMsg && (
                            <p className={`ma-save-msg ${saveMsg.startsWith("✓") ? "ma-save-msg--ok" : "ma-save-msg--err"}`}>
                                {saveMsg}
                            </p>
                        )}

                        {/* Submit */}
                        <button className="ma-submit-btn" onClick={handleSubmit} disabled={saving}>
                            {saving ? "Đang lưu..." : "Hoàn thành"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}