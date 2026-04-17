import React from "react";
import './loading.css'

export default function LoadingUser() {
    return (
        <div className="loading-user-overlay">
            <div className="loading-user-content">
                <div className="loading-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                </div>
            </div>
        </div>
    )
}