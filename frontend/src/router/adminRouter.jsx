import { Route } from "react-router-dom";
import LayoutAdmin from "../admin/components/layout/layout";
import LoginAdmin from "../admin/pages/login/login";
import HomeAdmin from "../admin/pages/home/home";
import UserManagement from "../admin/pages/user/manage_user";
import AdminProfile from "../admin/pages/admin/adminProfile/adminProfile";
import ManageAdmin from "../admin/pages/admin/manageAdmin/manageAdmin";
import AddAdmin from "../admin/pages/admin/addAdmin/addAdmin";
import AdminDetail from "../admin/pages/admin/adminDetail/adminDetail";
import ManageEvent from "../admin/pages/layout_event/event/event";
import AddEvent from "../admin/pages/layout_event/add_event/add_event";
import EventDetail from "../admin/pages/layout_event/event_detail/event_detail";
import ManageLayout from "../admin/pages/layout_event/layout/layout";
import AddLayout from "../admin/pages/layout_event/add_layout/add_layout";
import LayoutDetail from "../admin/pages/layout_event/layout_detail/layout_detail";
import ManageCategories from "../admin/pages/category/manageCategories/categories";
import AddCategory from "../admin/pages/category/addCategory/addCategory";
import EditEvent from "../admin/pages/layout_event/event/event_edit";
export function AdminRoutes() {
  return (
    <>
      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route path="/admin" element={<LayoutAdmin />}>
        <Route index element={<HomeAdmin />} />
        
        <Route path="manage_admin" element={<ManageAdmin />} />
        <Route path="manage_admin/:id" element={<AdminDetail />} />
        <Route path="add" element={<AddAdmin />} />

        <Route path="events" element={<ManageEvent />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="events/add" element={<AddEvent />} />
        <Route path="events/edit/:id" element={<EditEvent />} />

        <Route path="layout/:id" element={<LayoutDetail />} />
        <Route path="layout/add/:id" element={<AddLayout />} />
        

        <Route path="categories" element={<ManageCategories />} />
        <Route path="categories/add" element={<AddCategory />} />

        <Route path="profile" element={<AdminProfile />} />
        <Route path="user" element={<UserManagement />}/>
      </Route>
    </>
  );
}
