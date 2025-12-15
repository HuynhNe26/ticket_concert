import { useState, useEffect } from "react";

export default function SessionCountdown({ onExpire }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const expire = localStorage.getItem("tokenExpire");
    return expire ? Math.max(expire - Date.now(), 0) : 0;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const expire = localStorage.getItem("tokenExpire");
      if (!expire) return;

      const left = Math.max(expire - Date.now(), 0);
      setTimeLeft(left);

      if (left <= 0) {
        clearInterval(timer);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpire");
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpire]);

  const minutes = Math.floor(timeLeft / 1000 / 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>;
}