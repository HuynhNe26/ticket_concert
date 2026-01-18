import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LoginForm from "./Loginform";
import RegisterForm from "./Registerform";
import { saveToken, handleGoogleLoginAPI } from "./Authutils";
import Success from "../../components/notification/success/success.jsx";
import Error from "../../components/notification/error/error";
import Warning from "../../components/notification/warning/warning";
import "./Login_user.css";



export default function LoginPage({ isModal = false, onClose = null }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);
  
  // State cho notifications
  const [notification, setNotification] = useState({
    type: null, // 'success' | 'error' | 'warning'
    message: '',
    show: false
  });

  const showSuccess = (message) => {
    setNotification({ type: 'success', message, show: true });
  };

  const showError = (message) => {
    setNotification({ type: 'error', message, show: true });
  };

  const showWarning = (message) => {
    setNotification({ type: 'warning', message, show: true });
  };

  const hideNotification = () => {
    setNotification({ ...notification, show: false });
  };

  // Xử lý thành công đăng nhập thường
  const handleLoginSuccess = (data) => {
    saveToken(data);
    showSuccess("Đăng nhập thành công!");
    setTimeout(() => {
      hideNotification(); // Tắt thông báo
      if (isModal && onClose) {
        onClose(); // Đóng modal
      }
      setTimeout(() => {
        window.location.reload(); // Reload sau khi đóng modal
      }, 300);
    }, 1000);
  };

  // Xử lý thành công đăng ký
  const handleRegisterSuccess = () => {
    showSuccess("Đăng ký thành công! Vui lòng đăng nhập.");
    setTimeout(() => setTab("login"), 1500);
  };

  // Xử lý lỗi từ LoginForm
  const handleLoginError = (errorMessage) => {
    showError(errorMessage);
  };

  // Xử lý lỗi từ RegisterForm
  const handleRegisterError = (errorMessage) => {
    showError(errorMessage);
  };

  // Xử lý đăng nhập Google
  const handleGoogleLogin = async (credentialResponse) => {
    setLoading(true);

    try {
      const data = await handleGoogleLoginAPI(credentialResponse);
      saveToken(data);
      showSuccess("Đăng nhập Google thành công!");
      setTimeout(() => {
        hideNotification(); // Tắt thông báo
        if (isModal && onClose) {
          onClose(); // Đóng modal
        }
        setTimeout(() => {
          window.location.reload(); // Reload sau khi đóng modal
        }, 300);
      }, 1000);
    } catch (err) {
      showError(err.message || "Đăng nhập Google thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId="940435928416-p9ic1ginb2kon6nrrqk6e9g7r7pjbfkt.apps.googleusercontent.com">
      <div 
        className="auth-card" 
        style={isModal ? {
          position: 'relative',
          maxHeight: '85vh',
          overflowY: 'auto',
          overflowX: 'hidden'
        } : {}}
      >
        {/* Nút đóng (chỉ hiện khi isModal) */}
        {isModal && onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.7)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            ✕
          </button>
        )}

        <div className="brand">
          <img src="/logo.svg" alt="Logo" />
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              hideNotification();
              setTab("login");
            }}
          >
            Đăng nhập
          </button>
          <button
            className={`tab ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              hideNotification();
              setTab("register");
            }}
          >
            Đăng ký
          </button>
        </div>

        {/* Render form tương ứng */}
        {tab === "login" && (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            onGoogleLogin={handleGoogleLogin}
          />
        )}

        {tab === "register" && (
          <RegisterForm 
            onSuccess={handleRegisterSuccess}
            onError={handleRegisterError}
          />
        )}
      </div>

      {/* Notifications */}
      {notification.type === 'success' && notification.show && (
        <Success 
          message={notification.message}
          onClose={hideNotification}
        />
      )}

      {notification.type === 'error' && notification.show && (
        <Error 
          message={notification.message}
          onClose={hideNotification}
        />
      )}

      {notification.type === 'warning' && notification.show && (
        <Warning 
          message={notification.message}
          onClose={hideNotification}
        />
      )}
    </GoogleOAuthProvider>
  );
}