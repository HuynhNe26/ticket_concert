import './layout.css'
import Header from "../header/header";
import Footer from "../footer/footer";
import { Outlet } from "react-router-dom";
import ChatAI from '../chat_ai/chat_ai';

export default function LayoutUser() {
    return (
        <div className="layout-container">
            <Header />
            <main>
                <Outlet />
                <ChatAI />
            </main>
            <Footer />
        </div>
    )
}