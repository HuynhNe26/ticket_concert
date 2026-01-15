import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingAdmin from "../../../components/loading/loading";
import "./categories.css"

const API_BASE = process.env.REACT_APP_API_URL;

export default function ManageCategories() {
    const [categories, setCategories] = useState([])
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate();

    useEffect(() => {
        getAllCategories();
    }, [])

    const getAllCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/admin/categories`, {
                method: 'GET',
                headers: {
                    'content-type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                setCategories(data.data)
            } else {
                setError("Không thể tải danh sách thể loại");
            }
        }
        catch (err) {
            setError(err.message)
        }
        finally {
            setLoading(false)
        }
    }

    const handleAddCategory = () => {
        navigate('/admin/categories/add');
    }

    const handleEditCategory = (id) => {
        navigate(`/admin/categories/edit/${id}`);
    }

    const handleDeleteCategory = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa thể loại này?")) {
            try {
                const response = await fetch(`${API_BASE}/api/admin/categories/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'content-type': 'application/json'
                    }
                });

                const data = await response.json();
                if (data.success) {
                    getAllCategories();
                }
            } catch (err) {
                setError(err.message);
            }
        }
    }

    const handleAdd = async () => {
        navigate('/admin/categories/add')
    }

    if (loading) {
        return <LoadingAdmin />
    }

    return (
        <div className="manage-categories-container">
            <div className="categories-header">
                <h1>Quản lý thể loại</h1>
                <button className="btn-add-category" onClick={handleAddCategory}>
                    <span className="icon">+</span>
                    Thêm thể loại mới
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <span>⚠️ {error}</span>
                </div>
            )}

            <div className="categories-content">
                {categories.length === 0 ? (
                    <div className="no-categories">
                        <p>Chưa có thể loại nào. Hãy thêm thể loại mới!</p>
                    </div>
                ) : (
                    <div className="categories-table-wrapper">
                        <button onClick={handleAdd}>Thêm thể loại</button>
                        <table className="categories-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tên thể loại</th>
                                    <th>Ngày tạo</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category, index) => (
                                    <tr key={category.category_id || index}>
                                        <td>{index + 1}</td>
                                        <td className="category-name">{category.category_name}</td>
                                        <td>
                                            {category.createdAt 
                                                ? new Date(category.createdAt).toLocaleDateString('vi-VN')
                                                : "-"
                                            }
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-edit"
                                                    onClick={() => handleEditCategory(category.category_id)}
                                                >
                                                    Sửa
                                                </button>
                                                <button 
                                                    className="btn-delete"
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}