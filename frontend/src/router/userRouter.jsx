import { Route } from "react-router-dom";
import HomeUser from "../user/pages/home/home";
import LayoutUser from "../user/components/layout/layout";
import LoginUser from "../user/pages/login/login";

export function UserRoutes() {
  return (
    <>
    <Route path="/" element={<LayoutUser />}>
      <Route index element={<HomeUser />} />
    </Route>
    <Route path="/login" element={<LoginUser />} />
    </>
  );
}
