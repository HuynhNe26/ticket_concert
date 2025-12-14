import './loading.css';

export default function LoadingAdmin() {
    return (
        <div className="loading-overlay">
            <div className="loading-container">
                <div className="loading-bar"></div>
                <div className="loading-bar"></div>
                <div className="loading-bar"></div>
            </div>
        </div>
    )
}