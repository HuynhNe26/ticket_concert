import { Route } from "react-router-dom";
import HomeUser from "../user/pages/home/home";
import LayoutUser from "../user/components/layout/layout";
import EventDetail from "../user/pages/event/event";
import SearchPage from "../user/pages/search/search";
import ZonePage from "../user/pages/zone/zone/zone";
import CartPage from "../user/pages/cart/cart";
import CheckoutResult from "../user/pages/checkout/CheckoutResult";
import { useTokenExpiry } from "../user/components/hook/useTokenExpiry";
import CompleteProfile from "../user/pages/login/CompleteProfile/CompleteProfile";
export function UserRoutes() {
  useTokenExpiry();
  return (
    <>
      <Route path="/" element={<LayoutUser />}>
        <Route index element={<HomeUser />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/event/:id/booking" element={<ZonePage />} />
        <Route path='/my-cart' element={<CartPage />} />
        <Route path='/result' element={<CheckoutResult />} />
        <Route path='/complete-profile' element={<CompleteProfile />} />
      </Route>
    </>
  );
}