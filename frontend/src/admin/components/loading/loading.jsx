import './loading.css';

export default function LoadingAdmin({ onCancel }) {
    return (
        <div className="loading-overlay">
            <div className="loading-wrapper">
                <div className="loading-container">
                    <div className="loading-bar"></div>
                    <div className="loading-bar"></div>
                    <div className="loading-bar"></div>
                </div>
                {onCancel && (
                    <button className="btn-cancel-loading" onClick={onCancel}>
                        Hủy
                    </button>
                )}
            </div>
        </div>
    )
}