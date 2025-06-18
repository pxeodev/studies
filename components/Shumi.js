import { Input, Button, Tag } from 'antd'
import { MessageOutlined, PlusSquareOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import classnames from 'classnames'

import useKeyPass from '../hooks/useKeyPass';
import useAccount from '../hooks/useAccount';
import shumiStyles from '../styles/shumi.module.less'
import NotConnected from './gating/NotConnected'

// Helper function to generate session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

const Shumi = ({ isActive, initialSuggestions }) => {
  const hasKeyPass = useKeyPass()
  const walletAddress = useAccount()
  const [coinTag, setCoinTag] = useState(null);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [isClient, setIsClient] = useState(false);

  // Handle client-side hydration to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, stop, setMessages, setInput, error, reload, status } = useChat({
    api: '/api/ai',
    body: {
      walletAddress
    },
    query: {
      walletAddress // Add this to pass wallet address as query param
    }
  })
  const messagesEndRef = useRef(null)
  const aiInputRef = useRef(null)

  // Helper for checking if AI is generating a response
  const isGenerating = status === 'streaming' || status === 'submitted';

  // Store the processed messages
  const [processedMessages, setProcessedMessages] = useState([]);

  // Process messages once when they're received or changed
  useEffect(() => {
    const newProcessedMessages = messages.map(message => {
      if (message.role === 'assistant' && message.content) {
        // Fix markdown headings after colons/periods only in assistant messages
        return {
          ...message,
          // Only replace in content that actually has the pattern, which is rare
          processedContent: message.content.includes(':#') || message.content.includes('.#')
            ? message.content.replace(/([:.])(\s*)#/g, '$1\n\n#')
            : message.content
        };
      }
      return {
        ...message,
        processedContent: message.content
      };
    });

    setProcessedMessages(newProcessedMessages);
  }, [messages]);

  useEffect(() => {
    if (initialSuggestions) {
      setCurrentSuggestions(initialSuggestions.split('\n').filter(s => s.trim() !== ''));
    } else {
      const fetchDynamicSuggestions = async () => {
        try {
          console.log("Dynamically fetching suggestions...");
          const response = await fetch('/api/shumi-suggestions');
          if (!response.ok) throw new Error('Network response was not ok.');
          const data = await response.json();
          if (data.suggestions) {
            setCurrentSuggestions(data.suggestions.split('\n').filter(s => s.trim() !== ''));
          } else {
            setCurrentSuggestions([]); // Set to empty array if no suggestions
          }
        } catch (err) {
          console.error("Failed to fetch dynamic suggestions:", err);
          setCurrentSuggestions([]); // Set to empty array on error
        }
      };
      fetchDynamicSuggestions();
    }
  }, [initialSuggestions]);

  // Focus input when tab becomes active
  useEffect(() => {
      if (isActive && aiInputRef.current) {
          setTimeout(() => aiInputRef.current.focus(), 100)
      }
  }, [isActive]);

  // Check if we're on a coin page and set the coin tag
  useEffect(() => {
    const coinMetaTag = document.querySelector('meta[property="x-cr-coin-name"]');
    if (coinMetaTag && coinMetaTag.content) {
      setCoinTag(coinMetaTag.content);
    } else {
      setCoinTag(null); // Clear tag if not on coin page
    }
    // Re-check when route changes (simulated by isActive for now, better would be router event)
  }, [isActive]); // Dependency on isActive simulates route change check for now

  const clearChat = useCallback(() => {
    setMessages([])
    setInput('')
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
  }, [setMessages, setInput])

  const askAi = useCallback((e) => {
    e.preventDefault();

    if (!input.trim() && !coinTag) return;
    const coinId = document.querySelector('meta[property="x-cr-coin-id"]')?.content;
    // Use browser's local time string with timezone
    const browserDateTimeWithTimezone = new Date().toString();

    handleSubmit(e, {
      data: {
        browserDateTimeWithTimezone,
        sessionId,
        ...(coinTag && coinId ? { coinId } : {}) // Only include coinId if coinTag is set
      }
    });
  }, [handleSubmit, input, coinTag, sessionId]);

  // Handle removing the coin tag
  const handleRemoveCoinTag = useCallback(() => {
    setCoinTag(null);
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
        // Simple scroll to bottom - relies on CSS overflow-anchor for pinning
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]); // Run whenever messages change

  // Render gating or chat UI
  let content;
  // Show loading state during hydration to prevent hydration mismatch
  if (!isClient) {
    content = <div className={shumiStyles.gatingContainer}><div>Loading...</div></div>;
  } else if (!walletAddress) {
    content = <div className={shumiStyles.gatingContainer}><NotConnected feature='Shumi AI'/></div>;
  } else {
    // All authenticated users now have access (no KeyPass check needed)
    content = (
      <>
        <div className={shumiStyles.conversationArea} ref={messagesEndRef}>
          {messages.length > 0 ? (
             <>
               {processedMessages.map((message, index) => (
                 <div key={index} className={classnames(shumiStyles.messageContainer, {
                   [shumiStyles.userMessage]: message.role === 'user',
                   [shumiStyles.assistantMessage]: message.role === 'assistant'
                 })}>
                   {message.role === 'assistant' && (
                      <div className={shumiStyles.messageRole}>
                        <img className={shumiStyles.shumiAiIcon} src="/shumi-ai.png" alt="Shumi" width="18" height="18" />Shumi
                     </div>
                   )}
                   <div className={shumiStyles.messageContent}>
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>
                       {message.processedContent}
                     </ReactMarkdown>
                   </div>
                 </div>
               ))}
               {/* Show "Thinking..." indicator */}
               {(status === 'submitted' || (status === 'streaming' && messages[messages.length - 1]?.role === 'user') || (status === 'streaming' && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content?.trim())) ? (
                  <div className={classnames(shumiStyles.messageContainer, shumiStyles.assistantMessage, shumiStyles.thinkingIndicator)}>
                    <div className={shumiStyles.messageRole}><img className={shumiStyles.shumiAiIcon} src="/shumi-ai.png" alt="Shumi" width="18" height="18" />Shumi</div>
                    <div className={shumiStyles.messageContent}>Thinking...</div>
                 </div>
               ) : null}

               {/* Add error display */}
               {error && (
                  <div className={classnames(shumiStyles.messageContainer, shumiStyles.assistantMessage, shumiStyles.errorMessage)}>
                    <div className={shumiStyles.messageRole}><img className={shumiStyles.shumiAiIcon} src="/shumi-ai.png" alt="Shumi" width="18" height="18" />Shumi</div>
                    <div className={shumiStyles.messageContent}>
                     <div>Something went wrong. Please try again.</div>
                     <Button type="primary" onClick={() => reload()} className={shumiStyles.retryButton}>
                       Try Again
                     </Button>
                   </div>
                 </div>
               )}
                {/* Add the anchor element for CSS scroll pinning */}
               <div id="shumi-anchor" />
             </>
           ) : (
             <div className={shumiStyles.suggestions}>
               <div className={shumiStyles.suggestionTitle}>Suggestions:</div>
               {currentSuggestions.map((suggestion, index) => (
                 <div
                   key={index}
                   className={shumiStyles.suggestionButton}
                   onClick={() => setInput(suggestion)} // Use setInput directly
                 >
                   {suggestion}
                 </div>
               ))}
             </div>
           )}
        </div>
        <div className={shumiStyles.inputArea}>
          <Input
            className={shumiStyles.aiInput}
            allowClear
            prefix={<>
              <MessageOutlined className={shumiStyles.placeholderMagnifier}/>
              {coinTag && (
                <Tag
                  className={shumiStyles.coinTag}
                  closable
                  onClose={handleRemoveCoinTag}
                >
                  {coinTag}
                </Tag>
              )}
            </>}
            suffix={
              <>
                {isGenerating ? (
                  <Button type="primary" onClick={stop} className={shumiStyles.stopButton}>
                    Stop
                  </Button>
                ) : (
                  <Button type="primary" onClick={askAi} disabled={error != null || (!input.trim() && !coinTag)}>
                    Ask Shumi
                  </Button>
                )}
                <Button disabled={isGenerating || !messages.length || error != null} onClick={clearChat} className={shumiStyles.clearChatButton} icon={<PlusSquareOutlined />} />
              </>
            }
            value={input}
            onChange={handleInputChange}
            onPressEnter={askAi}
            ref={aiInputRef} // Use the specific ref for AI input
            spellCheck="false"
            disabled={error != null} // Disable input on error
            placeholder="Ask Shumi anything..."
          />
        </div>
      </>
    );
  }

  return (
    <div className={shumiStyles.aiTab}>
        {content}
    </div>
  );
};

export default Shumi;