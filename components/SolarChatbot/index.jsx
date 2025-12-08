import React, { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import styles from './chatbot.module.css';

const SolarChatbot = ({ energyData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: '☀️ Hello! I\'m your Solar AI Assistant. I can help you with energy optimization, anomaly detection, and consumption reports. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

  // Analyze energy data for insights
  const analyzeEnergyData = () => {
    if (!energyData) return 'No energy data available. Please check your dashboard.';
    
    const { solar = 0, home_consumption = 0, grid_import = 0, grid_export = 0 } = energyData;
    
    if (solar > home_consumption) {
      return `Great news! Your solar production (${solar}W) exceeds consumption (${home_consumption}W). You're generating ${solar - home_consumption}W of excess energy.`;
    } else {
      return `You're consuming ${home_consumption - solar}W more than your solar production. Consider increasing solar capacity or optimizing usage.`;
    }
  };

  // Generate AI response based on user input
  const generateResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('energy') || lowerMessage.includes('solar')) {
      return analyzeEnergyData();
    }
    if (lowerMessage.includes('anomaly') || lowerMessage.includes('problem')) {
      return 'I\'ve analyzed your system. No critical anomalies detected. All systems operating normally.';
    }
    if (lowerMessage.includes('report') || lowerMessage.includes('summary')) {
      return 'Your energy report is ready. You can view detailed analytics on the Energy page.';
    }
    if (lowerMessage.includes('optimization') || lowerMessage.includes('save')) {
      return 'Here are some tips: Run heavy appliances during peak solar hours, charge batteries when production is high, and use smart scheduling.';
    }
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! How can I help you optimize your solar energy system today?';
    }
    if (lowerMessage.includes('help')) {
      return 'I can help with: Energy analysis, anomaly detection, optimization tips, and consumption reports. What would you like to know?';
    }

    return 'I\'m here to help! You can ask me about energy optimization, anomalies, reports, or general solar system questions.';
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMsg = {
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Simulate bot typing
    setIsTyping(true);
    setTimeout(() => {
      const botResponse = generateResponse(inputValue);
      const botMsg = {
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 500);
  };

  const handleQuickAction = (action) => {
    setInputValue(action);
    setTimeout(() => {
      const userMsg = {
        type: 'user',
        content: action,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);

      setIsTyping(true);
      setTimeout(() => {
        const botResponse = generateResponse(action);
        const botMsg = {
          type: 'bot',
          content: botResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 500);
    }, 100);
  };

  const quickActions = [
    '📊 Energy Report',
    '🔍 Anomaly Detection',
    '⚡ Optimization Tips',
    '📈 Performance Analysis'
  ];

  return (
    <div className={styles.chatbotContainer}>
      {/* Floating Sun Button */}
      <button
        className={`${styles.sunButton} ${isOpen ? styles.sunButtonActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Solar AI Chatbot"
        type="button"
      >
        <span className={styles.sunIcon}>☀️</span>
        {messages.length > 1 && <div className={styles.notificationDot}></div>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerContent}>
              <span className={styles.headerIcon}>☀️</span>
              <div className={styles.headerText}>
                <h3>Solar AI Assistant</h3>
                <span className={styles.statusOnline}>● Online</span>
              </div>
            </div>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className={styles.quickActions}>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(action)}
                  className={styles.quickActionButton}
                  type="button"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className={styles.messagesContainer}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`${styles.message} ${msg.type === 'user' ? styles.userMessage : styles.botMessage}`}
              >
                {msg.type === 'bot' && <span className={styles.botAvatar}>☀️</span>}
                <div className={styles.messageContent}>
                  <div className={styles.messageText}>
                    <p>{msg.content}</p>
                  </div>
                  <span className={styles.messageTime}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className={`${styles.message} ${styles.botMessage}`}>
                <span className={styles.botAvatar}>☀️</span>
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
              placeholder="Ask about your energy..."
              className={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              className={styles.sendButton}
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              aria-label="Send message"
              type="button"
            >
              {inputValue.trim() ? '→' : '→'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolarChatbot;