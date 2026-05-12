import Router from "../../../router/router";
import { useTokenExpiry } from "./useTokenExpiry";
import Warning from "../notification/warning/warning"; // đổi đường dẫn cho đúng

export default function AppWrapper() {
  const { showExpiry, setShowExpiry } = useTokenExpiry();

  return (
    <>
      <Warning
        show={showExpiry}
        message="Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!"
        onClose={() => setShowExpiry(false)}
      />
      <Router />
    </>
  );
}