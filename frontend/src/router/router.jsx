import { Routes } from "react-router-dom";
import { UserRoutes } from "./userRouter";
import { AdminRoutes } from "./adminRouter";

export default function Router() {
  return (
    <Routes>
      {UserRoutes()}
      {AdminRoutes()}
    </Routes>
  );
}
