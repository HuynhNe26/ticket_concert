import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoadingAdmin from "../../../components/loading/loading";
import "./categories.css"

const API_BASE = process.env.REACT_APP_API_URL;

export default function ManageCategories() {
    const [categories, setCategories] = useState([])
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [openMenuId, setOpenMenuId] = useState(null)
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        getAllCategories();
        
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [])

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getAllCategories = async () => {
        // Hủy request cũ nếu có
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Tạo AbortController mới
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/admin/categories`, {
                method: 'GET',
                headers: {
                    'content-type': 'application/json'
                },
                signal: abortControllerRef.current.signal
            });

            const data = await response.json();
            if (data.success) {
                setCategories(data.data)
            } else {
                setError("Không thể tải danh sách thể loại");
            }
        }
        catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch đã bị hủy');
            } else {
                setError(err.message)
            }
        }
        finally {
            setLoading(false)
            abortControllerRef.current = null;
        }
    }

    const handleCancelLoading = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setLoading(false);
        }
    }

    const handleAddCategory = () => {
        navigate('/admin/categories/add');
    }

    const toggleMenu = (categoryId) => {
        setOpenMenuId(openMenuId === categoryId ? null : categoryId);
    }

    const handleEditCategory = (id) => {
        setOpenMenuId(null);
        navigate(`/admin/categories/edit/${id}`);
    }

    const handleDeleteCategory = async (id) => {
        setOpenMenuId(null);
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

    if (loading) {
        return <LoadingAdmin onCancel={handleCancelLoading} />
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
                        <table className="categories-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tên thể loại</th>
                                    <th>Ngày tạo</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category, index) => (
                                    <tr key={category.category_id || index}>
                                        <td>{index + 1}</td>
                                        <td className="category-name">{category.category_name}</td>
                                        <td>
                                            {category.created_at  
                                                ? new Date(category.created_at).toLocaleDateString('vi-VN')
                                                : "-"
                                            }
                                        </td>
                                        <td>
                                            <div className="action-menu-wrapper" ref={openMenuId === category.category_id ? menuRef : null}>
                                                <button 
                                                    className="btn-menu"
                                                    onClick={() => toggleMenu(category.category_id)}
                                                >
                                                    ⋮
                                                </button>
                                                
                                                {openMenuId === category.category_id && (
                                                    <div className="dropdown-menu">
                                                        <button 
                                                            className="menu-item edit"
                                                            onClick={() => handleEditCategory(category.category_id)}
                                                        >
                                                            <span className="menu-icon">✏️</span>
                                                            Sửa
                                                        </button>
                                                        <button 
                                                            className="menu-item delete"
                                                            onClick={() => handleDeleteCategory(category.category_id)}
                                                        >
                                                            <span className="menu-icon">🗑️</span>
                                                            Xóa
                                                        </button>
                                                    </div>
                                                )}
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