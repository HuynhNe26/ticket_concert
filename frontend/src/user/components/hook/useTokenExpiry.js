import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingUser from '../loading/loading';

export function useTokenExpiry() {
  const navigate = useNavigate();

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpire');
  };

  useEffect(() => {
    const expire = localStorage.getItem('tokenExpire');
    if (!expire) return;

    // ✅ Trường hợp 1: User refresh trang → kiểm tra ngay lập tức
    const remaining = Number(expire) - Date.now();
    if (remaining <= 0) {
      clearAuth();
      navigate('/');
      window.location.reload();
      return;
    }

    // ✅ Trường hợp 2: User đang dùng → đếm ngược đến lúc hết hạn
    const timer = setTimeout(() => {
      clearAuth();
      alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
      navigate('/');
    }, remaining);

    return () => clearTimeout(timer);

  }, [navigate]); 
}
