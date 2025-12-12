import React, { useState, useRef, useEffect } from 'react';
import styles from './chatbot.module.css';

// API call function (you can also import from lib/chatbot-api.js)
async function sendChatMessage(message, userId, energyData = null) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        user_id: userId,
        energy_data: energyData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

const SolarChatbot = ({ energyData, userId = 'default_user' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: '☀️ Hello! I\'m Solaira, your Solar AI Assistant. I can help you with energy optimization, anomaly detection, and consumption reports. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Send message to backend API
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setError(null);

    try {
      // Call the backend API
      const response = await sendChatMessage(
        inputValue,
        userId,
        energyData
      );

      const botMessage = {
        type: 'bot',
        content: response.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setError(err.message || 'Failed to get response. Please try again.');
      
      const errorMessage = {
        type: 'bot',
        content: '❌ Sorry, I encountered an error. Please try again or check your connection.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    setInputValue(action);
    setTimeout(() => handleSendMessage(), 100);
  };

  return (
    <>
      {/* Floating Sun Icon Button */}
      <button 
        className={`${styles.sunButton} ${isOpen ? styles.sunButtonActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Solar AI Assistant"
      >
        <svg className={styles.sunIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="currentColor"/>
          <path d="M12 2V4M12 20V22M22 12H20M4 12H2M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66M6.34 6.34L4.93 4.93" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {!isOpen && <span className={styles.notificationDot}></span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerContent}>
              <div className={styles.headerIcon}>☀️</div>
              <div className={styles.headerText}>
                <h3>Solar AI Assistant</h3>
                <span className={styles.statusOnline}>● Online</span>
              </div>
            </div>
            <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <button onClick={() => handleQuickAction('Show me a consumption report')}>
              📊 Report
            </button>
            <button onClick={() => handleQuickAction('Check for anomalies')}>
              🔍 Check Health
            </button>
            <button onClick={() => handleQuickAction('Give me optimization tips')}>
              💡 Optimize
            </button>
            <button onClick={() => handleQuickAction('Show peak pricing alerts')}>
              💰 Pricing
            </button>
          </div>

          {/* Messages */}
          <div className={styles.messagesContainer}>
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`${styles.message} ${message.type === 'user' ? styles.userMessage : styles.botMessage}`}
              >
                {message.type === 'bot' && (
                  <div className={styles.botAvatar}>☀️</div>
                )}
                <div className={styles.messageContent}>
                  <div className={styles.messageText}>
                    {message.content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  <span className={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className={`${styles.message} ${styles.botMessage}`}>
                <div className={styles.botAvatar}>☀️</div>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask me anything about your solar system..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className={styles.input}
            />
            <button 
              onClick={handleSendMessage}
              className={styles.sendButton}
              disabled={!inputValue.trim()}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SolarChatbot;