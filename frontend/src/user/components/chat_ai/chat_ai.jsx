import React, { useState, useRef, useEffect } from "react";
import "./chat_ai.css";
import LoginPage from "../../../user/pages/login/Loginpage";

const API_BASE = process.env.REACT_APP_API_URL;

function formatTime(date) {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Login Required Card ──────────────────────────────────────────────────────
function LoginRequiredCard({ onLogin }) {
  return (
    <div className="chat-login-card">
      <div className="chat-login-icon">🔐</div>
      <div className="chat-login-title">Đăng nhập để mua vé</div>
      <div className="chat-login-desc">
        Bạn cần đăng nhập để tiến hành đặt vé sự kiện.
      </div>
      <button className="chat-login-btn" onClick={onLogin}>
        Đăng nhập ngay →
      </button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onOpenLogin }) {
  const content = msg.content || "";

  if (content.includes("[LOGIN_REQUIRED]")) {
    const text = content.replace("[LOGIN_REQUIRED]", "").trim();
    return (
      <div>
        {text && <div className="msg-bubble">{text}</div>}
        <LoginRequiredCard onLogin={onOpenLogin} />
      </div>
    );
  }

  return <div className="msg-bubble">{content}</div>;
}

// ─── Main ChatAI ─────────────────────────────────────────────────────────────
export default function ChatAI() {
  const [isOpen, setIsOpen]         = useState(false);
  const [showDot, setShowDot]       = useState(true);
  const [isTyping, setIsTyping]     = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content: "Xin chào! 👋 Mình là trợ lý AI hỗ trợ sự kiện. Hỏi mình về vé, sự kiện, hay nghệ sĩ nhé!",
      time: new Date(),
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const [sessionId]    = useState(() => crypto.randomUUID());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleOpen = () => {
    setIsOpen(true);
    setShowDot(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const sendMessage = async (text) => {
    const content = text || inputValue.trim();
    if (isTyping || !content) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type: "user", content, time: new Date() },
    ]);
    setInputValue("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ message: content, sessionId }),
      });

      const data = await res.json();
      setIsTyping(false);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          content: data.answer || data.error || "Không có phản hồi.",
          time: new Date(),
        },
      ]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!",
          time: new Date(),
        },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className="chat-root">
        {/* Chat Window */}
        {isOpen && (
          <div className="chat-window">

            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(34,197,94,0.8)" />
                  <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">Trợ lý Sự kiện AI</div>
                <div className="chat-header-status">Đang hoạt động</div>
              </div>
              <button className="chat-header-close" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`msg-row ${msg.type}`}>
                  <div className={`msg-avatar ${msg.type}`}>
                    {msg.type === "bot" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(34,197,94,0.9)">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                      </svg>
                    ) : "👤"}
                  </div>
                  <div>
                    {msg.type === "bot" ? (
                      <MessageBubble
                        msg={msg}
                        onOpenLogin={() => setShowLoginModal(true)}
                      />
                    ) : (
                      <div className="msg-bubble">{msg.content}</div>
                    )}
                    <div className="msg-time">{formatTime(msg.time)}</div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="msg-row bot">
                  <div className="msg-avatar bot">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(34,197,94,0.9)">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                  </div>
                  <div className="typing-bubble">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="chat-input-area">
              <div className="chat-input-row">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Hỏi về sự kiện, vé, nghệ sĩ..."
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className="chat-send-btn"
                  onClick={() => sendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="white" />
                  </svg>
                </button>
              </div>
              <div className="chat-hint">Enter gửi · Shift+Enter xuống dòng</div>
            </div>

          </div>
        )}

        {/* FAB Button */}
        <button
          className={`chat-fab ${isOpen ? "open" : ""}`}
          onClick={isOpen ? () => setIsOpen(false) : handleOpen}
          aria-label="Mở chat hỗ trợ"
        >
          {showDot && !isOpen && <div className="chat-fab-dot" />}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            {isOpen ? (
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                fill="currentColor"
                opacity="0.95"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Login Modal - Rendered OUTSIDE chat-root để tránh z-index conflicts */}
      {showLoginModal && (
        <div
          className="chat-modal-overlay"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="chat-modal-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="chat-modal-close"
              onClick={() => setShowLoginModal(false)}
            >
              ✕
            </button>
            <LoginPage
              isModal={true}
              onClose={() => setShowLoginModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}