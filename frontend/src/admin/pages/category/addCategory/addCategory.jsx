import React, { useState } from "react";
import LoadingAdmin from "../../../components/loading/loading";
import { useNavigate } from "react-router-dom";
import "./addCategory.css"

const API_BASE = process.env.REACT_APP_API_URL;

export default function AddCategory() {
    const [category, setCategory] = useState({
        name: "",
        description: ""
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate();
 
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCategory(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const addCategory = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!category.name.trim()) {
            setError("Vui lòng nhập tên thể loại");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${API_BASE}/api/admin/categories/`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    name: category.name,
                    description: category.description
                })
            })

            const data = await response.json()
            if (data.success) {
                // Thông báo thành công
                alert("Thêm thể loại thành công!");
                // Quay về trang quản lý
                navigate('/admin/categories');
            } else {
                setError(data.message || "Không thể thêm thể loại");
            }
        }
        catch (err) {
            setError(err.message)
        }
        finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        navigate('/admin/categories');
    }

    if (loading) {
        return <LoadingAdmin />
    }

    return (
        <div className="add-category-container">
            <div className="add-category-header">
                <h1>Thêm thể loại mới</h1>
                <button className="btn-back" onClick={handleCancel}>
                    ← Quay lại
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <span>⚠️ {error}</span>
                </div>
            )}

            <div className="add-category-content">
                <form onSubmit={addCategory} className="category-form">
                    <div className="form-group">
                        <label htmlFor="name">
                            Tên thể loại <span className="required">*</span>
                        </label>
                        <input 
                            type="text"
                            id="name"
                            name="name"
                            value={category.name}
                            onChange={handleChange}
                            placeholder="Nhập tên thể loại..."
                            className="form-input"
                        />
                    </div>

                    <div className="form-actions">
                        <button 
                            type="button" 
                            className="btn-cancel"
                            onClick={handleCancel}
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            className="btn-submit"
                        >
                            <span className="icon">+</span>
                            Thêm thể loại
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}