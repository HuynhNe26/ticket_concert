import { Route } from "react-router-dom";
import HomeUser from "../user/pages/home/home";
import LayoutUser from "../user/components/layout/layout";
import LoginPage from "../user/pages/login/Loginpage";
import SearchPage from "../user/pages/search/search";


export function UserRoutes() {
  return (
    <>
    <Route path="/" element={<LayoutUser />}>
      <Route index element={<HomeUser />} />
      <Route path="/search" element={<SearchPage />} />
    </Route>
    <Route path="/login" element={<LoginPage />} />
    </>
  );
}