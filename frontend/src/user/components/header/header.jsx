import { useState, useEffect } from "react";
import './header.css';
import { jwtDecode } from "jwt-decode";
import { Link, useNavigate } from "react-router-dom"; 
import LoginPage from "../../pages/login/Loginpage"; // Import LoginPage
import SessionCountdown from "../Countdown/Countdown";

const API_BASE = "http://localhost:5000/api";

export default function Header() {
    const [user, setUser] = useState(null);
    const [keyword, setKeyword] = useState(""); 
    const [showLoginModal, setShowLoginModal] = useState(false); // State hiển thị modal
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const storedUser = JSON.parse(localStorage.getItem("user"));
                setUser(storedUser || decoded);
            } catch (err) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem("token");

        try {
            if (token) {
                await fetch(`${API_BASE}/users/logout`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
        } catch (err) {
            console.log("Logout update fail", err);
        }

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpire");
        setUser(null);
    };

    const handleSearch = () => {
        navigate(`/search?q=${encodeURIComponent(keyword)}`);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <>
            <header className="header">
                <div className="header-container">
                    <div className="header-left">
                        <Link to="/" className="logo-link">
                            <img src="/logo.png" alt="Ticket Concert Logo" className="logo" />
                        </Link>
                        
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm sự kiện, nghệ sĩ..."
                                className="search-input"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={handleKeyPress}
                            />
                            <button className="search-button" onClick={handleSearch}>
                                Tìm kiếm
                            </button>
                        </div>
                    </div>

                    <div className="header-right">
                        <Link to="/create-event" className="header-link"><span>Tạo sự kiện</span></Link>
                        <Link to="/my-tickets" className="header-link"><span>Vé của tôi</span></Link>
                        <div className="auth-section">
                            {user ? (
                                <div>Xin chào, {user.fullName} | <button onClick={handleLogout} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>Đăng xuất</button></div>
                            ) : (
                                <div>
                                    <button 
                                        onClick={() => setShowLoginModal(true)}
                                        style={{background:'none', border:'none', color:'white', cursor:'pointer', textDecoration:'underline'}}
                                    >
                                        Đăng nhập
                                    </button>
                                    {' | '}
                                    <button 
                                        onClick={() => setShowLoginModal(true)}
                                        style={{background:'none', border:'none', color:'white', cursor:'pointer', textDecoration:'underline'}}
                                    >
                                        Đăng ký
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Modal hiển thị LoginPage */}
            {showLoginModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setShowLoginModal(false)}
                >
                    <div 
                        style={{
                            position: 'relative',
                            maxWidth: '500px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Nút đóng */}
                        <button
                            onClick={() => setShowLoginModal(false)}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: 'none',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '20px',
                                color: '#666',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>
                        
                        {/* Hiển thị LoginPage */}
                        <LoginPage />
                    </div>
                </div>
            )}
        </>
    );
}