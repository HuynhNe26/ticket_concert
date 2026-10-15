import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X } from "lucide-react";
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

// ─── Formatted Message Component ──────────────────────────────────────────────
function FormattedMessage({ text }) {
  if (!text) return null;
  const lines = text.split("\n");

  const parseInline = (str) => {
    const parts = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    let keyIdx = 0;

    while ((match = boldRegex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={`b-${keyIdx++}`} className="chat-msg-strong">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }
    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }
    return parts.length > 0 ? parts : str;
  };

  return (
    <div className="chat-msg-content">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="chat-msg-spacer" />;
        }

        // Bullet item: starts with * or - or •
        const isBullet = /^[*\-•]\s+/.test(trimmed);
        if (isBullet) {
          const bulletText = trimmed.replace(/^[*\-•]\s+/, "");
          return (
            <div key={idx} className="chat-msg-bullet">
              <span className="chat-bullet-dot">•</span>
              <span className="chat-bullet-text">{parseInline(bulletText)}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="chat-msg-paragraph">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onOpenLogin }) {
  const content = msg.content || "";

  if (content.includes("[LOGIN_REQUIRED]")) {
    const text = content.replace("[LOGIN_REQUIRED]", "").trim();
    return (
      <>
        {text && (
          <div className="msg-bubble">
            <FormattedMessage text={text} />
          </div>
        )}
        <LoginRequiredCard onLogin={onOpenLogin} />
      </>
    );
  }

  return (
    <div className="msg-bubble">
      {msg.type === "bot" ? (
        <FormattedMessage text={content} />
      ) : (
        <span>{content}</span>
      )}
    </div>
  );
}

const QUICK_SUGGESTIONS = [
  { icon: "🔥", label: "Sự kiện nổi bật", query: "Sự kiện nổi bật" },
  { icon: "🎟️", label: "Vé dưới 1 triệu", query: "Vé dưới 1 triệu" },
  { icon: "📅", label: "Lịch diễn tháng này", query: "Lịch diễn tháng này" },
  { icon: "📍", label: "Concert tại TP.HCM", query: "Concert tại TP.HCM" },
];

// ─── Main ChatAI ─────────────────────────────────────────────────────────────
export default function ChatAI() {
  const [isOpen, setIsOpen]                 = useState(false);
  const [showDot, setShowDot]               = useState(true);
  const [isTyping, setIsTyping]             = useState(false);
  const [inputValue, setInputValue]         = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content: "Xin chào! 👋 Mình là trợ lý AI của Ticket Concert. Bạn muốn tìm kiếm sự kiện hay xem thông tin vé nào?",
      time: new Date(),
    },
  ]);

  const messagesEndRef = useRef(null);
  const latestMsgRef   = useRef(null);
  const inputRef       = useRef(null);
  const touchStartY    = useRef(0);
  const [sessionId]    = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.type === "bot" && lastMsg.id !== 1 && latestMsgRef.current) {
        latestMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Lock body scroll and track virtual keyboard on mobile
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    if (window.innerWidth <= 640) {
      document.body.style.overflow = "hidden";
    }

    const handleViewportResize = () => {
      if (window.innerWidth <= 640 && window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardOffset(offset > 120 ? offset : 0);
      } else {
        setKeyboardOffset(0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
      window.visualViewport.addEventListener("scroll", handleViewportResize);
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
        window.visualViewport.removeEventListener("scroll", handleViewportResize);
      }
    };
  }, [isOpen]);

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
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
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
          content: "Xin lỗi, kết nối bị gián đoạn. Vui lòng thử lại sau!",
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

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 80) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="chat-backdrop"
          onClick={() => setIsOpen(false)}
          aria-label="Đóng chat"
        />
      )}

      <div className={`chat-root ${isOpen ? "is-open" : ""}`}>
        {/* Chat Window */}
        {isOpen && (
          <div
            className="chat-window"
            style={{
              bottom: keyboardOffset ? `${keyboardOffset}px` : undefined,
            }}
          >
            {/* Sheet Handle for swipe-down to dismiss */}
            <div
              className="chat-sheet-handle-wrap"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onClick={() => setIsOpen(false)}
            >
              <div className="chat-sheet-handle" aria-hidden="true" />
            </div>

            {/* Header */}
            <div
              className="chat-header"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <div className="chat-header-avatar">
                <Bot size={20} strokeWidth={2.2} className="chat-header-bot-icon" />
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">Trợ lý Sự kiện AI</div>
                <div className="chat-header-status">
                  <span className="chat-status-dot" />
                  <span>Sẵn sàng hỗ trợ 24/7</span>
                </div>
              </div>
              <button
                className="chat-header-close"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  ref={idx === messages.length - 1 ? latestMsgRef : null}
                  className={`msg-row ${msg.type}`}
                >
                  {/* Avatar */}
                  <div className={`msg-avatar ${msg.type}`}>
                    {msg.type === "bot" ? (
                      <Bot size={16} strokeWidth={2.2} className="msg-bot-icon" />
                    ) : (
                      "👤"
                    )}
                  </div>

                  <div className="msg-col">
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

              {/* Quick suggestions when conversation starts */}
              {messages.length <= 1 && (
                <div className="chat-suggestions">
                  <div className="chat-suggestions-label">Gợi ý nhanh cho bạn:</div>
                  <div className="chat-chips-scroll">
                    {QUICK_SUGGESTIONS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="chat-chip"
                        onClick={() => sendMessage(item.query)}
                      >
                        <span className="chat-chip-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="msg-row bot">
                  <div className="msg-avatar bot">
                    <Bot size={16} strokeWidth={2.2} className="msg-bot-icon" />
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
                  aria-label="Gửi tin nhắn"
                >
                  <Send size={15} />
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
          aria-label={isOpen ? "Đóng chat hỗ trợ" : "Mở chat hỗ trợ"}
        >
          {showDot && !isOpen && <div className="chat-fab-dot" />}
          {isOpen ? (
            <X size={22} />
          ) : (
            <Bot size={24} strokeWidth={2.2} className="chat-fab-icon" />
          )}
        </button>
      </div>

      {/* Login Modal */}
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
              <X size={18} />
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