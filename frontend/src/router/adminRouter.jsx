import { Route} from "react-router-dom";
import LayoutAdmin from "../admin/components/layout/layout";
import LoginAdmin from "../admin/pages/login/login";

export function AdminRoutes() {
  return (
    <>
    <Route path="/admin/login" element={<LoginAdmin />} /> 
      <Route path="/admin" element={<LayoutAdmin />}>

      </Route>
    </>
  );
}
