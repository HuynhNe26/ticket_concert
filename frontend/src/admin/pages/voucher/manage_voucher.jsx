import React, { useEffect, useState } from "react";
import "./manage_voucher.css";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL;

const STATUS_LABEL = {
    true: { label: "Đang hoạt động", cls: "badge--active" },
    false: { label: "Hết hạn", cls: "badge--expired" },
};


export default function ManageVoucher() {
    const [vouchers, setVouchers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchCode, setSearchCode] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const navigate = useNavigate();
    const data = new Date();

   useEffect(() => {
        const getVoucher = async () => {
            setLoading(true);
            try {

                const params = new URLSearchParams();

                if (filterMonth) params.append("month", filterMonth);
                if (filterYear) params.append("year", filterYear);
                if (searchCode) params.append("code", searchCode);

                const res = await fetch(`${API_BASE}/api/admin/vouchers?${params.toString()}`);
                const data = await res.json();

                if (data.success) {
                    setVouchers(data.data);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        getVoucher();
    }, [filterMonth, filterYear, searchCode]);


    const openAdd = () => {
        setEditTarget(null);
        setForm({});
        setShowModal(true);
    };

    const openEdit = (v) => {
        setEditTarget(v);
        setForm({
            voucher_code: v.voucher_code, voucher_value: v.voucher_value, voucher_type: v.voucher_type,
            min_order_value: v.min_order_value, max_reduction: v.max_reduction,
            voucher_start: v.voucher_start?.slice(0,10), voucher_end: v.voucher_end?.slice(0,10), voucher_quantity: v.voucher_quantity,
            description: v.description, distributor: v.distributor, distributor_img: v.distributor_img,
            voucher_status: v.voucher_status
        });
        setShowModal(true);
    };

    const handleFormChange = (e) => {
        const { name, type } = e.target;

        if (type === 'file') {
            const selectedFile = e.target.files[0]; 
            
            if (selectedFile) {
                setForm({ ...form, [name]: selectedFile });
            }
        } else {
            setForm({ ...form, [name]: e.target.value });
        }
    };

    const handleStatusChange = async (e) => {
        const checked = e.target.checked;

        setForm(prev => ({
            ...prev,
            voucher_status: checked
        }));

        if (!editTarget) return;
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/admin/vouchers/${editTarget.voucher_id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    voucher_status: checked
                })
            });

            const data = await res.json();
            if (data.success) {
                window.location.reload();
            }

        } catch (error) {
            console.error("Lỗi cập nhật trạng thái:", error);
        } finally {
            setLoading(false)
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log(form)

        const formData = new FormData();

        Object.keys(form).forEach(key => {
            formData.append(key, form[key]);
        });
        try {

            const res = await fetch(`${API_BASE}/api/admin/vouchers/create`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                alert("Thêm voucher mới thành công!")
                if (editTarget) {
                    setVouchers(vs =>
                        vs.map(v =>
                            v.voucher_id === editTarget.voucher_id
                                ? { ...v, ...form }
                                : v
                        )
                    );
                } else {
                    setVouchers(vs => [data.data, ...vs]);
                }

                setShowModal(false);
            }

        } catch (err) {
            console.error(err);
        }
    };
    const handleDelete = async (id) => {

        console.log(id)
        try {
            const res = await fetch(`${API_BASE}/api/admin/vouchers/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-type': 'application/json'
                }
            });

            const data = await res.json();
            if (data.success) {
                alert(data.message);
                setDeleteTarget(null)
            } else {
                alert(data.message)
            }
        } catch (err) {
            console.error("Lỗi xóa voucher:", error);
        }
    };

    const years = Array.from({ length: 5 }, (_, i) => 2023 + i);

    return (
        <div className="mv-root">
            {/* Header */}
            <div className="mv-header">
                <div className="mv-header__left">
                    <span className="mv-header__icon">🎟</span>
                    <div>
                        <h1 className="mv-header__title">Quản lý Voucher</h1>
                    </div>
                </div>
                <button className="mv-btn mv-btn--add" onClick={openAdd}>
                    <span>＋</span> Thêm Voucher
                </button>
            </div>

            {/* Toolbar */}
            <div className="mv-toolbar">
                <div className="mv-search-wrap">
                    <span className="mv-search-icon">🔍</span>
                    <input
                        className="mv-input mv-input--search"
                        placeholder="Tìm mã voucher..."
                        value={searchCode}
                        onChange={e => setSearchCode(e.target.value)}
                    />
                    {searchCode && (
                        <button className="mv-clear-btn" onClick={() => setSearchCode("")}>✕</button>
                    )}
                </div>
                <div className="mv-filter-group">
                    <select
                        className="mv-select"
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                    >
                        <option value="">-- Tháng --</option>
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                        ))}
                    </select>
                    <select
                        className="mv-select"
                        value={filterYear}
                        onChange={e => setFilterYear(e.target.value)}
                    >
                        <option value="">-- Năm --</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {(filterMonth || filterYear) && (
                        <button className="mv-btn mv-btn--ghost" onClick={() => { setFilterMonth(""); setFilterYear(""); }}>
                            Xóa lọc
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && <div className="mv-error">{error}</div>}

            {/* Table */}
            {loading ? (
                <div className="mv-loading">
                    <div className="mv-spinner" />
                    <span>Đang tải...</span>
                </div>
            ) : vouchers.length === 0 ? (
                <div className="mv-empty">
                    <span className="mv-empty__icon">🎫</span>
                    <p>Không tìm thấy voucher nào</p>
                </div>
            ) : (
                <div className="mv-table-wrap">
                    <table className="mv-table">
                        <thead>
                            <tr>
                                <th>Mã Voucher</th>
                                <th>Giảm giá</th>
                                <th>Đơn tối thiểu</th>
                                <th>Giảm tối đa</th>
                                <th>Thời hạn</th>
                                <th>Đã dùng</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vouchers.map(v => (
                                <tr key={v.voucher_id} className="mv-row">
                                    <td>
                                        <span className="mv-code">{v.voucher_code}</span>
                                    </td>
                                    <td className="mv-discount">
                                        {v.voucher_type === true ? `${v.voucher_value}%` : `${Number(v.voucher_value).toLocaleString()} đ`}
                                    </td>
                                    <td>{Number(v.min_order_value).toLocaleString()} đ</td>
                                    <td>{Number(v.max_reduction).toLocaleString()}đ</td>
                                    <td className="mv-date-range">
                                        <span>{new Date(v.voucher_start).toLocaleString("vi-VN")}</span>
                                        <span className="mv-date-sep">→</span>
                                        <span>{new Date(v.voucher_end).toLocaleString("vi-VN")}</span>
                                    </td>
                                    <td>
                                        <div className="mv-usage">
                                            <div className="mv-usage-bar">
                                                <div
                                                    className="mv-usage-fill"
                                                    style={{ width: `${Math.min((v.voucher_used / v.voucher_quantity) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="mv-usage-text">{v.voucher_used}/{v.voucher_quantity}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`mv-badge ${STATUS_LABEL[v.voucher_status]?.cls || ""}`}>
                                            {STATUS_LABEL[v.voucher_status]?.label || v.voucher_status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="mv-actions">
                                            <button className="mv-btn mv-btn--edit" onClick={() => openEdit(v)}>✏️</button>
                                            <button className="mv-btn mv-btn--del" onClick={() => setDeleteTarget(v)}>🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="mv-overlay" onClick={() => setShowModal(false)}>
                    <div className="mv-modal" onClick={e => e.stopPropagation()}>
                        <div className="mv-modal__head">
                            <h2>{editTarget ? "Chỉnh sửa Voucher" : "Thêm Voucher mới"}</h2>
                            <button className="mv-modal__close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form className="mv-form" onSubmit={handleSubmit}>
                            <div className="mv-form__grid">
                                <label className="mv-label">
                                    Mã Voucher
                                    <input className="mv-input" name="voucher_code" value={form.voucher_code} onChange={handleFormChange} required placeholder="VD: SALE20" />
                                </label>
                                <label className="mv-label">
                                    Loại giảm
                                    <select className="mv-select mv-select--full" name="voucher_type" value={form.voucher_type ? "true" : "false"} onChange={handleFormChange}>
                                        <option value="true">Phần trăm (%)</option>
                                        <option value="false">Số tiền cố định (đ)</option>
                                    </select>
                                </label>
                                <label className="mv-label">
                                    Giá trị giảm
                                    <input className="mv-input" name="voucher_value" type="number" value={form.voucher_value} onChange={handleFormChange} required placeholder={form.type === "percent" ? "VD: 20" : "VD: 30000"} />
                                </label>
                                <label className="mv-label">
                                    Giảm tối đa (đ)
                                    <input className="mv-input" name="max_reduction" type="number" value={form.max_reduction} onChange={handleFormChange} required placeholder="VD: 50000" />
                                </label>
                                <label className="mv-label">
                                    Đơn tối thiểu (đ)
                                    <input className="mv-input" name="min_order_value" type="number" value={form.min_order_value} onChange={handleFormChange} required placeholder="VD: 100000" />
                                </label>
                                <label className="mv-label">
                                    Giới hạn sử dụng
                                    <input className="mv-input" name="voucher_quantity" type="number" value={form.voucher_quantity} onChange={handleFormChange} required placeholder="VD: 50" />
                                </label>
                                <label className="mv-label">
                                    Ngày bắt đầu
                                    <input className="mv-input" name="voucher_start" type="date" value={form.voucher_start} onChange={handleFormChange} required />
                                </label>
                                <label className="mv-label">
                                    Ngày kết thúc
                                    <input className="mv-input" name="voucher_end" type="date" value={form.voucher_end} onChange={handleFormChange} required />
                                </label>
                                <label className="mv-label">
                                    Mô tả
                                    <textarea className="mv-input" name="description" type="text" value={form.description} onChange={handleFormChange} required />
                                </label>
                                <label className="mv-label">
                                    Nhà phân phối
                                    <input className="mv-input" name="distributor" type="text" value={form.distributor} onChange={handleFormChange} required />
                                </label>
                                <label className="mv-label">
                                    Nhà phân phối
                                    <input className="mv-input" name="distributor_img" type="file" onChange={handleFormChange} required />
                                </label>
                                <label className="mv-label">
                                    Hình nhà phân phối
                                    <img className="mv-input"  src={form.distributor_img} alt={form.distributor ? form.distributor : ""}/>
                                </label>
                                
                            </div>
                            <div className="mv-form__actions">
                                <label className="mv-label mv-toggle">
                                    Trạng thái
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            name="voucher_status"
                                            checked={form.voucher_status}
                                            onChange={handleStatusChange}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </label>
                                <button type="button" className="mv-btn mv-btn--ghost" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="mv-btn mv-btn--add">
                                    {editTarget ? "Lưu thay đổi" : "Tạo Voucher"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteTarget && (
                <div className="mv-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="mv-modal mv-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="mv-modal__head">
                            <h2>Xác nhận xóa</h2>
                            <button className="mv-modal__close" onClick={() => setDeleteTarget(null)}>✕</button>
                        </div>
                        <p className="mv-confirm-text">
                            Bạn có chắc muốn xóa voucher <strong>{deleteTarget.voucher_code}</strong>? Hành động này không thể hoàn tác.
                        </p>
                        <div className="mv-form__actions">
                            <button className="mv-btn mv-btn--ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
                            <button className="mv-btn mv-btn--danger" onClick={() => handleDelete(deleteTarget.voucher_id)}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}