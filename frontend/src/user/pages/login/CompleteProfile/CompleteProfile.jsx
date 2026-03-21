import { useState  } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL;

export default function CompleteProfile({ onDone }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [birthOfDay, setBirthOfDay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSave = async () => {
    if (!phoneNumber || !gender || !birthOfDay) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (!phoneNumber.match(/^0\d{9}$/)) {
      setError("Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/users/update-profile-gg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phoneNumber, gender, birthOfDay })
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.message || "Cập nhật thất bại"); return; }
      
      navigate("/")
    } catch (err) {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {/* Popup */}
        <div style={{
          background: '#1a1d29',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          padding: '40px 36px',
          width: '100%',
          maxWidth: '440px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src="/Logo.png" alt="Logo" style={{ width: 110 }} />
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#f0f4f8',
            textAlign: 'center',
            marginBottom: 8
          }}>
            Bổ sung thông tin
          </h2>
          <p style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            marginBottom: 28,
            lineHeight: 1.6
          }}>
            Vui lòng bổ sung để hoàn tất đăng ký tài khoản
          </p>

          {/* Form */}
          <div className="form">

            {/* Số điện thoại */}
            <div className="field">
              <label className="field-label">Số điện thoại</label>
              <input
                type="tel"
                placeholder="0xxxxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Ngày sinh + Giới tính */}
            <div className="field-row">
              <div className="field">
                <label className="field-label">Ngày sinh</label>
                <input
                  type="date"
                  value={birthOfDay}
                  onChange={(e) => setBirthOfDay(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Giới tính</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Chọn...</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            {/* Error */}
            {error && <p className="msg">{error}</p>}

            {/* Submit */}
            <button
              type="button"
              className="btn-complete"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Hoàn tất"}
            </button>

          </div>
        </div>
      </div>
    </>
  );
}