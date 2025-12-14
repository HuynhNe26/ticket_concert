import './layout.css'
import Navbar from "../navbar/navbar";
import { Outlet } from "react-router-dom";
import { useAdminAuth } from "../../context/authAdmin";
import LoadingAdmin from "../loading/loading";
import { Navigate } from "react-router-dom";

export default function LayoutAdmin() {
    const { isLoggedIn, loading } = useAdminAuth();

    if (loading) return <LoadingAdmin />;
    if (!isLoggedIn) return <Navigate to="/admin/login" replace />;
    return (
        <div>
            <Navbar />
            <main>
                <Outlet />
            </main>
        </div>
    )
}