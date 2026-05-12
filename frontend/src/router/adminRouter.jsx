import { Route } from "react-router-dom";
import LayoutAdmin from "../admin/components/layout/layout";
import LoginAdmin from "../admin/pages/login/login";
import HomeAdmin from "../admin/pages/home/home";
import UserManagement from "../admin/pages/user/manage_user";
import AdminProfile from "../admin/pages/admin/adminProfile/adminProfile";
import ManageAdmin from "../admin/pages/admin/manageAdmin/manageAdmin";
import AddAdmin from "../admin/pages/admin/addAdmin/addAdmin";
import ManageEvent from "../admin/pages/layout_event/event/event";
import AddEvent from "../admin/pages/layout_event/add_event/add_event";
import EventDetail from "../admin/pages/layout_event/event_detail/event_detail";
import AddLayout from "../admin/pages/layout_event/add_layout/add_layout";
import LayoutDetail from "../admin/pages/layout_event/layout_detail/layout_detail";
import ManageCategories from "../admin/pages/category/manageCategories/categories";
import AddCategory from "../admin/pages/category/addCategory/addCategory";
import EditEvent from "../admin/pages/layout_event/event/event_edit";
import ManageOrder from "../admin/pages/order/manage_order/manage_order";
import ManageOrderDetail from "../admin/pages/order/order_detail/order_detail";
import OrderDetail from "../admin/pages/order/order_detail/order_detail";
import OrderEvent from "../admin/pages/order/order_event/order_event";
import ManageVoucher from "../admin/pages/voucher/manage_voucher";
import Statistic from "../admin/pages/statistic/statistic";
import TicketQR from "../admin/pages/ticketqr/ticketqr";

export function AdminRoutes() {
  return (
    <>
      <Route path="/admin/login" element={<LoginAdmin />} />

      <Route path="/admin" element={<LayoutAdmin />}>
        <Route index element={<HomeAdmin />} />
        
        <Route path="manage_admin" element={<ManageAdmin />} />
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

        <Route path='orders' element={<ManageOrder />} />
        <Route path='orders/:id' element={<ManageOrderDetail />} />
        <Route path='orders/order-event' element={<OrderEvent />} />
        <Route path='orders/order-event/order-detail' element={<OrderDetail />} />
        <Route path='report' element={<Statistic />} />

        <Route path='tickets' element={<TicketQR />} />

        <Route path='vouchers' element={<ManageVoucher />} />
      </Route>
    </>
  );
}
