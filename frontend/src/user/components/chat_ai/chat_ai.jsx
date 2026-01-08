import React, { useState, useRef, useEffect } from "react";
import './chat_ai.css';

export default function ChatAI() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            content: 'Xin chào! Tôi có thể giúp gì cho bạn?'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (inputValue.trim() === '') return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputValue
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');

        // Simulate bot response
        setTimeout(() => {
            const botMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: 'Cảm ơn bạn đã liên hệ! Đây là tin nhắn tự động.'
            };
            setMessages(prev => [...prev, botMessage]);
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="chat-ai-container">
            <button 
                className="chat-toggle-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle chat"
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <h3>Trợ lý AI</h3>
                        <button 
                            className="chat-close-btn"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="chat-messages">
                        {messages.map((message) => (
                            <div 
                                key={message.id} 
                                className={`chat-message ${message.type}`}
                            >
                                <div className={`message-avatar ${message.type}`}>
                                    {message.type === 'bot' ? '🤖' : '👤'}
                                </div>
                                <div className="message-content">
                                    <p>{message.content}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-container">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Nhập tin nhắn..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button 
                            className="chat-send-btn"
                            onClick={handleSendMessage}
                            disabled={inputValue.trim() === ''}
                            aria-label="Send message"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}