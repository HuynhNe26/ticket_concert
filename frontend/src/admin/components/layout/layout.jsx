import React from "react";
import './layout.css'
import Navbar from "../navbar/navbar";
import { Outlet } from "react-router-dom";

export default function LayoutAdmin() {
    return (
        <div>
            <Navbar />
            <main>
                <Outlet />
            </main>
        </div>
    )
}