import { useState, useEffect } from "react";
import './header.css';
import {jwtDecode} from "jwt-decode";
import { Link } from "react-router-dom";
import SessionCountdown from "../Countdown/Countdown";
// import { useTranslation } from 'react-i18next';

export default function Header() {
    const [user, setUser] = useState(null);

     useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token); // giải mã token nếu muốn
                const storedUser = JSON.parse(localStorage.getItem("user"));
                setUser(storedUser || decoded);
            } catch (err) {
                console.log("Token không hợp lệ:", err);
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
    }, []);
    // const { t, i18n } = useTranslation();

    // const changeLanguage = (lang) => {
    //     i18n.changeLanguage(lang);
    // };
     const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
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
                            placeholder={"Nhập..."}
                            className="search-input"
                        />
                        <button className="search-button">
                            Tìm kiếm
                        </button>
                    </div>
                </div>

                <div className="header-right">
                    <Link to="/create-event" className="header-link">
                        <span>Tạo sự kiện</span>
                    </Link>
                    
                    <Link to="/my-tickets" className="header-link">
                        <span>Vé của tôi</span>
                    </Link>

                    <div className="auth-section">
                         {user ? (
                        <div>
                        Xin chào, {user.fullName} | Phiên còn: <SessionCountdown onExpire={() => setUser(null)} />
                        </div>
                    ) : (
                        <div>
                        <Link to="/login">Đăng nhập</Link> | <Link to="/register">Đăng ký</Link>
                        </div>
                    )}
                    </div>

                    <div className="language-selector">
                        <button 
                            // className={`lang-btn ${i18n.language === 'vi' ? 'active' : ''}`}
                            // onClick={() => changeLanguage('vi')}
                        >
                            VI
                        </button>
                        <button 
                            // className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                            // onClick={() => changeLanguage('en')}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}