import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import "./language/config";
import { AuthAdminProvider } from "./admin/context/authAdmin";
import AppWrapper from "./user/components/hook/AppWrapper";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <AuthAdminProvider>
      <AppWrapper />
    </AuthAdminProvider>
  </BrowserRouter>
);