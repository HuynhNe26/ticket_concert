import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useTokenExpiry() {
  const navigate = useNavigate();
  const [showExpiry, setShowExpiry] = useState(false);

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpire');
  };

  useEffect(() => {
    const expire = localStorage.getItem('tokenExpire');
    if (!expire) return;

    const remaining = Number(expire) - Date.now();
    if (remaining <= 0) {
      clearAuth();
      navigate('/');
      window.location.reload();
      return;
    }

    const timer = setTimeout(() => {
      clearAuth();
      setShowExpiry(true);
      setTimeout(() => {
        window.location.reload();
        navigate('/');
      }, 3000);
    }, remaining);

    return () => clearTimeout(timer);
  }, [navigate]);

  return { showExpiry, setShowExpiry }; // 👈 thiếu dòng này
}