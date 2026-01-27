import { Route } from "react-router-dom";
import HomeUser from "../user/pages/home/home";
import LayoutUser from "../user/components/layout/layout";
import LoginPage from "../user/pages/login/Loginpage";
import EventDetail from "../user/pages/event/event";
import SearchPage from "../user/pages/search/search";
import ZonePage from "../user/pages/zone/zone/zone";


export function UserRoutes() {
  return (
    <>
      <Route path="/" element={<LayoutUser />}>
        <Route index element={<HomeUser />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/event/:id/booking" element={<ZonePage />} />
      </Route>
    </>
  );
}