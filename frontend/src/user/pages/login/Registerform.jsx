import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL;

export default function RegisterForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwc, setShowPwc] = useState(false);
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [birthOfDay, setBirthOfDay] = useState("");
  const [gender, setGender] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    if (password !== confirm) { setMsg("Mật khẩu xác nhận không khớp."); return; }
    if (!phone.match(/^0\d{9}$/)) { setMsg("Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)."); return; }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullname, birthOfDay, email, password, phoneNumber: phone, gender }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data?.message || "Đăng ký thất bại"); return; }
      setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      setMsg("Lỗi mạng: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleRegister}>

      {/* 1. Họ và tên */}
      <div className="field">
        <label className="field-label" style={{color: 'white'}}>Họ và tên</label>
        <input
          type="text"
          placeholder="Nguyễn Văn A"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          required
        />
      </div>

      {/* 2. Email */}
      <div className="field">
        <label className="field-label" style={{color: 'white'}}>Email</label>
        <input
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {/* 3. Số điện thoại */}
      <div className="field">
        <label className="field-label" style={{color: 'white'}}>Số điện thoại</label>
        <input
          type="tel"
          placeholder="0xxxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      {/* 4. Ngày sinh + Giới tính — 2 cột */}
      <div className="field-row">
        <div className="field">
          <label className="field-label" style={{color: 'white'}}>Ngày sinh</label>
          <input
            type="date"
            value={birthOfDay}
            onChange={(e) => setBirthOfDay(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" style={{color: 'white'}}>Giới tính</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            style={{height: '45px'}}
          >
            <option value="">Chọn</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>
        </div>
      </div>

      {/* 5. Mật khẩu */}
      <div className="field">
        <label className="field-label" style={{color: 'white'}}>Mật khẩu</label>
        <div className="input-with-addon">
          <input
            type={showPwd ? "text" : "password"}
            placeholder="Tối thiểu 8 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" className="addon" onClick={() => setShowPwd(!showPwd)}>
            {showPwd ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </div>

      {/* 6. Xác nhận mật khẩu */}
      <div className="field">
        <label className="field-label" style={{color: 'white'}}>Xác nhận mật khẩu</label>
        <div className="input-with-addon">
          <input
            type={showPwc ? "text" : "password"}
            placeholder="Nhập lại mật khẩu"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button type="button" className="addon" onClick={() => setShowPwc(!showPwc)}>
            {showPwc ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </div>

      <button className="btn_register" disabled={loading}>
        {loading ? "Đang đăng ký..." : "Đăng ký"}
      </button>

      {msg && <p className="msg">{msg}</p>}
    </form>
  );
}