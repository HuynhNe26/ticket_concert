import './layout.css'
import Header from "../header/header";
import Footer from "../footer/footer";
import { Outlet } from "react-router-dom";

export default function LayoutUser() {
    return (
        <div className="layout-container">
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}