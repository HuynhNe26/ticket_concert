import React, { useState, useRef, useEffect } from "react";
import "./chat_ai.css";

const QUICK_REPLIES = [
  "Còn vé VIP không?",
  "Giá vé bao nhiêu?",
  "Địa điểm ở đâu?",
  "Quy định sự kiện?",
];

function formatTime(date) {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDot, setShowDot] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content: "Xin chào! 👋 Tôi là trợ lý AI hỗ trợ mua vé sự kiện. Bạn cần hỏi gì về chương trình không?",
      time: new Date(),
    },
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
    if (!content) return;

    const userMsg = { id: Date.now(), type: "user", content, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          content: data.reply || data.error || "Không có phản hồi.",
          time: new Date(),
        },
      ]);
    } catch (err) {
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
    <div className="chat-root">
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <div className="chat-header-info">
              <div className="chat-header-name">Trợ lý AI Sự kiện</div>
              <div className="chat-header-status">● Đang hoạt động</div>
            </div>
            <button className="chat-header-close" onClick={() => setIsOpen(false)} aria-label="Đóng">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={msg.id}>
                <div className={`msg-row ${msg.type}`}>
                  <div className={`msg-avatar ${msg.type}`}>
                    {msg.type === "bot" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="msg-bubble">{msg.content}</div>
                    <div className="msg-time">{formatTime(msg.time)}</div>
                  </div>
                </div>

                {msg.type === "bot" && i === 0 && (
                  <div className="quick-replies">
                    {QUICK_REPLIES.map((q) => (
                      <button key={q} className="quick-reply-btn" onClick={() => sendMessage(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="msg-row bot">
                <div className="msg-avatar bot">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
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

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Nhập câu hỏi về vé, sự kiện..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chat-send-btn"
                onClick={() => sendMessage()}
                disabled={!inputValue.trim()}
                aria-label="Gửi"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="white"/>
                </svg>
              </button>
            </div>
            <div className="chat-hint">Nhấn Enter để gửi · Shift+Enter xuống dòng</div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className={`chat-fab ${isOpen ? "open" : ""}`}
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        aria-label="Mở chat"
      >
        {showDot && !isOpen && <div className="chat-fab-dot" />}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {isOpen ? (
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          ) : (
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" fill="white" opacity="0.95"/>
          )}
        </svg>
      </button>
    </div>
  );
}