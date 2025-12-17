import { useState, useEffect } from "react";
import './header.css';
import { jwtDecode } from "jwt-decode";
import { Link, useNavigate } from "react-router-dom"; 
import SessionCountdown from "../Countdown/Countdown";

export default function Header() {
    const [user, setUser] = useState(null);
    const [keyword, setKeyword] = useState(""); 
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

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    const handleSearch = () => {
        navigate(`/search?q=${encodeURIComponent(keyword)}`);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
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
                            <div><Link to="/login">Đăng nhập</Link> | <Link to="/register">Đăng ký</Link></div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}