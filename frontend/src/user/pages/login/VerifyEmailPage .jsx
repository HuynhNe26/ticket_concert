import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); 
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");

    fetch(`${process.env.REACT_APP_API_URL}/api/users/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) { setStatus("success"); }
        else { setStatus("error"); setMsg(data.message); }
      })
      .catch(() => { setStatus("error"); setMsg("Lỗi mạng!"); });
  }, []);

  if (status === "loading") return <p>Đang xác thực...</p>;
  if (status === "success") return navigate("/")
  return <p>❌ {msg}</p>;
}