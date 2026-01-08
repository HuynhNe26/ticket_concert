import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL;

export default function RegisterForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [birthOfDay, setBirthOfDay] = useState("");
  const [gender, setGender] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    
    if (password !== confirm) {
      setMsg("Mật khẩu xác nhận không khớp.");
      return;
    }
    
    if (!phone.match(/^0\d{9}$/)) {
      setMsg(
        "Số điện thoại không hợp lệ (phải có 10 chữ số, bắt đầu bằng 0)."
      );
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullname,
          birthOfDay,
          email,
          password,
          phoneNumber: phone,
          gender,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.message || "Đăng ký thất bại");
        return;
      }

      setMsg("Đăng ký thành công! Chuyển đến trang đăng nhập...");
      setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      setMsg("Lỗi mạng: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleRegister}>
      <input
        type="text"
        placeholder="Họ và tên"
        value={fullname}
        onChange={(e) => setFullname(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <label className="label"></label>
      <input
        type="date"
        className="input"
        value={birthOfDay}
        onChange={(e) => setBirthOfDay(e.target.value)}
        required
      />
      <label className="label"></label>
      <select
        className="input"
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        required
      >
        <option value="">Giới tính</option>
        <option value="Nam">Nam</option>
        <option value="Nữ">Nữ</option>
        <option value="Khác">Khác</option>
      </select>

      <input
        type="tel"
        placeholder="Số điện thoại"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <div className="input-with-addon">
        <input
          type={showPwd ? "text" : "password"}
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          className="addon"
          onClick={() => setShowPwd(!showPwd)}
        >
          {showPwd ? "Ẩn" : "Hiện"}
        </button>
      </div>
      <input
        type="password"
        placeholder="Xác nhận mật khẩu"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Đang đăng ký..." : "Đăng ký"}
      </button>

      {msg && <p className="msg">{msg}</p>}
    </form>
  );
}