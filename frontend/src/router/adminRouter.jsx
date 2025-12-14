import { Route } from "react-router-dom";
import LayoutAdmin from "../admin/components/layout/layout";
import LoginAdmin from "../admin/pages/login/login";
import HomeAdmin from "../admin/pages/home/home";
import ManageUser from "../admin/pages/user/manage_user";
import AdminProfile from "../admin/pages/admin/adminProfile/adminProfile";

export function AdminRoutes() {
  return (
    <>
      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route path="/admin" element={<LayoutAdmin />}>
        <Route index element={<HomeAdmin />} />

        <Route path="profile/:id" element={<AdminProfile />} />
        <Route path="user" element={<ManageUser />}/>
      </Route>
    </>
  );
}
