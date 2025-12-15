import { Route } from "react-router-dom";
import LayoutAdmin from "../admin/components/layout/layout";
import LoginAdmin from "../admin/pages/login/login";
import HomeAdmin from "../admin/pages/home/home";
import ManageUser from "../admin/pages/user/manage_user";
import AdminProfile from "../admin/pages/admin/adminProfile/adminProfile";
import ManageAdmin from "../admin/pages/admin/manageAdmin/manageAdmin";
import AddAdmin from "../admin/pages/admin/addAdmin/addAdmin";
import AdminDetail from "../admin/pages/admin/adminDetail/adminDetail";

export function AdminRoutes() {
  return (
    <>
      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route path="/admin" element={<LayoutAdmin />}>
        <Route index element={<HomeAdmin />} />
        <Route path="manage_admin" element={<ManageAdmin />} />
        <Route path="manage_admin/:id" element={<AdminDetail />} />
        <Route path="add" element={<AddAdmin />} />

        <Route path="profile/:id" element={<AdminProfile />} />
        <Route path="user" element={<ManageUser />}/>
      </Route>
    </>
  );
}
