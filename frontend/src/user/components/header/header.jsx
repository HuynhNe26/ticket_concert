import React from "react";
import './header.css'
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export default function Header() {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lang) => {
        i18n.changeLanguage(lang);
    };

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-left">
                    <Link to="/" className="logo-link">
                        <img src="/logo.png" alt="Ticketbox Logo" className="logo" />
                    </Link>
                    
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder={t('search_placeholder')}
                            className="search-input"
                        />
                        <button className="search-button">
                            {t('search_button')}
                        </button>
                    </div>
                </div>

                <div className="header-right">
                    <Link to="/create-event" className="header-link">
                        <span>{t('create_event')}</span>
                    </Link>
                    
                    <Link to="/my-tickets" className="header-link">
                        <span>{t('my_tickets')}</span>
                    </Link>

                    <div className="auth-section">
                        <Link to="/login" className="auth-link">
                            <span>{t('login')}</span>
                        </Link>
                        <span className="separator">|</span>
                        <Link to="/register" className="auth-link">
                            <span>{t('register')}</span>
                        </Link>
                    </div>

                    <div className="language-selector">
                        <button 
                            className={`lang-btn ${i18n.language === 'vi' ? 'active' : ''}`}
                            onClick={() => changeLanguage('vi')}
                        >
                            VI
                        </button>
                        <button 
                            className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                            onClick={() => changeLanguage('en')}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}