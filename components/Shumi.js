import { Input, Button, Tag } from 'antd'
import { MessageOutlined, PlusSquareOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import classnames from 'classnames'

import { useWeb3Auth } from '../contexts/Web3AuthContext';
import shumiStyles from '../styles/shumi.module.less'
import NotConnected from './gating/NotConnected'
import ShumiCopyButton from './ShumiCopyButton'

// Loading indicator with real progress updates
const ShumiLoadingBlock = ({ progress }) => {
  const getMessage = () => {
    if (progress?.message) return progress.message;
    if (progress?.phase === 'classifying') return 'Understanding your request...';
    if (progress?.phase === 'executing') return 'Fetching data...';
    if (progress?.phase === 'generating') return 'Generating response...';
    return 'Shumi is thinking...';
  };

  return (
    <div className={shumiStyles.shumiLoadingCard}>
      <div className={shumiStyles.shumiLoadingTitle}>
        <span className={shumiStyles.shumiLoadingEmoji}>🍄</span>
        <span>{getMessage()}</span>
      </div>
      <div className={shumiStyles.shumiLoadingSpinner}>
        <div className={shumiStyles.spinnerDot}></div>
        <div className={shumiStyles.spinnerDot}></div>
        <div className={shumiStyles.spinnerDot}></div>
      </div>
    </div>
  );
};

// Helper function to generate session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

const Shumi = ({ isActive, initialSuggestions }) => {
  const { loggedIn, getAccounts } = useWeb3Auth()
  const [walletAddress, setWalletAddress] = useState(null)
  const [coinTag, setCoinTag] = useState(null);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [isClient, setIsClient] = useState(false);

  // Handle client-side hydration to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get wallet address from Web3Auth
  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (loggedIn && getAccounts) {
        try {
          const accounts = await getAccounts();
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error getting wallet address:', error);
          setWalletAddress(null);
        }
      } else {
        setWalletAddress(null);
      }
    };

    fetchWalletAddress();
  }, [loggedIn, getAccounts]);

  const [progress, setProgress] = useState(null);
  const [input, setInput] = useState(''); // Manage input state manually in v5

  // Create transport with current walletAddress - recreate when walletAddress changes
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/ai',
      body: {
        walletAddress
      },
      query: {
        walletAddress // Add this to pass wallet address as query param
      }
    });
  }, [walletAddress]);

  const {
    messages,
    sendMessage,
    stop,
    setMessages,
    error,
    reload,
    status
  } = useChat({
    transport,
    onData: (data) => {
      // Handle progress updates from the data stream
      // The data comes as a stringified JSON object from the data stream
      try {
        let parsed;
        if (typeof data === 'string') {
          // If it's a string, it might be double-stringified (data field contains stringified JSON)
          try {
            parsed = JSON.parse(data);
            // If the data field is a string, parse it again
            if (parsed?.data && typeof parsed.data === 'string') {
              try {
                parsed = JSON.parse(parsed.data);
              } catch {
                // If parsing fails, use the original parsed object
              }
            }
          } catch {
            // If parsing fails, try to parse as direct JSON
            parsed = JSON.parse(data);
          }
        } else {
          parsed = data;
        }

        if (parsed?.type === 'progress') {
          console.log('[DEBUG] Received progress update:', parsed);
          setProgress(parsed);
        } else {
          // Log non-progress data for debugging (but only first few to avoid spam)
          if (typeof parsed === 'object' && parsed !== null) {
            console.log('[DEBUG] Received non-progress data:', Object.keys(parsed));
          }
        }
      } catch (error) {
        // Log parsing errors for debugging
        console.warn('[DEBUG] Error parsing data in onData:', error, 'Data:', typeof data === 'string' ? data.substring(0, 100) : data);
      }
    },

    onError: (error) => {
      console.error('[DEBUG] useChat error:', error);
    }
  })
  const messagesEndRef = useRef(null)
  const aiInputRef = useRef(null)

  // Debug: Log error and status changes
  useEffect(() => {
    if (error) {
      console.error('[DEBUG] Shumi error state changed:', {
        error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        status,
        messagesCount: messages.length,
        lastMessage: messages[messages.length - 1]
      });
    }
  }, [error, status, messages]);

  // Debug: Log status changes
  useEffect(() => {
    console.log('[DEBUG] Shumi status changed:', status);
  }, [status]);

  // Helper for checking if AI is generating a response
  const isGenerating = status === 'streaming' || status === 'submitted';

  // Show stop button only during initial submission, not during streaming
  const showStopButton = status === 'submitted';

  // Disable input only during initial submission, allow typing during streaming
  const disableInput = status === 'submitted';

  // Store the processed messages
  const [processedMessages, setProcessedMessages] = useState([]);

  // Process messages once when they're received or changed
  useEffect(() => {
    console.log('[DEBUG] Processing messages:', messages.length, messages);

    const newProcessedMessages = messages.map(message => {
      // Handle v5 format: messages may have parts[] instead of content
      let content = message.content;
      if (!content && message.parts && Array.isArray(message.parts)) {
        // Extract text from parts array
        content = message.parts
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('');
      }

      if (message.role === 'assistant' && content) {
        // Fix markdown headings after colons/periods only in assistant messages
        return {
          ...message,
          content, // Ensure content is set
          // Only replace in content that actually has the pattern, which is rare
          processedContent: content.includes(':#') || content.includes('.#')
            ? content.replace(/([:.])(\s*)#/g, '$1\n\n#')
            : content
        };
      }
      return {
        ...message,
        content: content || message.content || '', // Ensure content exists
        processedContent: content || message.content || ''
      };
    });

    console.log('[DEBUG] Processed messages:', newProcessedMessages.length, newProcessedMessages);
    setProcessedMessages(newProcessedMessages);
  }, [messages]);

  // Helper function to create a mosaic-style arrangement
  const createMosaicLayout = (suggestions) => {
    // Separate suggestions into long and short categories
    const longSuggestions = suggestions.filter(s => s.length > 30);
    const shortSuggestions = suggestions.filter(s => s.length <= 30);

    // Sort each category by length
    longSuggestions.sort((a, b) => b.length - a.length);
    shortSuggestions.sort((a, b) => a.length - b.length);

    const result = [];
    let longIndex = 0;
    let shortIndex = 0;

    // Create a pattern that intersperses long and short suggestions
    // Pattern: long, short, short, long, short, long, long, short, etc.
    const pattern = [1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1]; // 1 = long, 0 = short
    let patternIndex = 0;

    while (longIndex < longSuggestions.length || shortIndex < shortSuggestions.length) {
      const useLong = pattern[patternIndex % pattern.length];

      if (useLong && longIndex < longSuggestions.length) {
        result.push(longSuggestions[longIndex++]);
      } else if (!useLong && shortIndex < shortSuggestions.length) {
        result.push(shortSuggestions[shortIndex++]);
      } else if (longIndex < longSuggestions.length) {
        // Fallback to long if no short available
        result.push(longSuggestions[longIndex++]);
      } else if (shortIndex < shortSuggestions.length) {
        // Fallback to short if no long available
        result.push(shortSuggestions[shortIndex++]);
      }

      patternIndex++;
    }

    return result;
  };

  useEffect(() => {
    if (initialSuggestions) {
      const suggestions = initialSuggestions.split('\n').filter(s => s.trim() !== '');
      // Create mosaic-style layout for better visual balance
      const mosaicSuggestions = createMosaicLayout(suggestions);
      setCurrentSuggestions(mosaicSuggestions);
    } else {
      const fetchDynamicSuggestions = async () => {
        try {
          console.log("Dynamically fetching suggestions...");
          const response = await fetch('/api/shumi-suggestions');
          if (!response.ok) throw new Error('Network response was not ok.');
          const data = await response.json();
          if (data.suggestions) {
            const suggestions = data.suggestions.split('\n').filter(s => s.trim() !== '');
            // Create mosaic-style layout for better visual balance
            const mosaicSuggestions = createMosaicLayout(suggestions);
            setCurrentSuggestions(mosaicSuggestions);
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
    setInput('') // Clear input manually
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
  }, [setMessages])

  // Clear progress when starting a new request
  useEffect(() => {
    if (status === 'submitted') {
      setProgress(null);
    }
  }, [status]);

  const askAi = useCallback((e) => {
    if (e) e.preventDefault();
    setProgress(null); // Clear previous progress

    if (!input.trim() && !coinTag) return;
    const coinId = document.querySelector('meta[property="x-cr-coin-id"]')?.content;
    // Use browser's local time string with timezone
    const browserDateTimeWithTimezone = new Date().toString();

    // In v5, use sendMessage to send messages
    // Pass walletAddress in the body options to ensure it's included with each request
    sendMessage({
      text: input.trim()
    }, {
      body: {
        walletAddress, // Include walletAddress in the request body
        data: {
          browserDateTimeWithTimezone,
          sessionId,
          ...(coinTag && coinId ? { coinId } : {}) // Only include coinId if coinTag is set
        }
      }
    });

    // Clear input after submission in v5
    setInput('');
  }, [sendMessage, input, coinTag, sessionId]);

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
                        <img className={shumiStyles.shumiAiIcon} src="/shumi.png" alt="Shumi" width="18" height="18" />Shumi
                     </div>
                   )}
                   <div className={shumiStyles.messageContent}>
                     <ReactMarkdown
                       remarkPlugins={[remarkGfm]}
                       components={{
                         a: ({ href, children, ...props }) => (
                           <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                             {children}
                           </a>
                         )
                       }}
                     >
                       {message.processedContent}
                     </ReactMarkdown>
                   </div>
                   {/* Only show copy button if message is not currently streaming */}
                   {!(status === 'streaming' && index === messages.length - 1 && message.role === 'assistant') && (
                     <div className={shumiStyles.messageCopyButton}>
                       <ShumiCopyButton
                         text={message.content || message.processedContent}
                         position={message.role === 'assistant' ? 'left' : 'right'}
                         className="shumi-copy-button"
                       />
                     </div>
                   )}
                 </div>
               ))}
               {/* Show Shumi loading block */}
               {(status === 'submitted' || (status === 'streaming' && messages[messages.length - 1]?.role === 'user') || (status === 'streaming' && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content?.trim())) ? (
                  <ShumiLoadingBlock progress={progress} />
               ) : null}

               {/* Add error display */}
               {error && (
                  <div className={classnames(shumiStyles.messageContainer, shumiStyles.assistantMessage, shumiStyles.errorMessage)}>
                    <div className={shumiStyles.messageRole}><img className={shumiStyles.shumiAiIcon} src="/shumi.png" alt="Shumi" width="18" height="18" />Shumi</div>
                    <div className={shumiStyles.messageContent}>
                     <div>Something went wrong. Please try again.</div>
                     {process.env.NODE_ENV === 'development' && (
                       <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                         Error: {error?.message || String(error)}
                       </div>
                     )}
                     <Button type="primary" onClick={() => reload()} className={shumiStyles.retryButton}>
                       Try Again
                     </Button>
                   </div>
                 </div>
               )}
                {/* Add the anchor element for CSS scroll pinning */}
               <div id="shumi-anchor" />
             </>
           ) : null}
        </div>
        <div className={classnames(shumiStyles.floatingContainer, {
          [shumiStyles.floatingContainerCentered]: messages.length === 0
        })}>
          {messages.length === 0 && (
            <div className={shumiStyles.suggestions}>
              {currentSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={shumiStyles.suggestionButton}
                  onClick={() => setInput(suggestion)} // Set input manually
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
          <div className={shumiStyles.inputArea}>
            <Input
              className={shumiStyles.aiInput}
              allowClear
              prefix={coinTag && (
                <Tag
                  className={shumiStyles.coinTag}
                  closable
                  onClose={handleRemoveCoinTag}
                >
                  {coinTag}
                </Tag>
              )}
              suffix={
                <>
                  {showStopButton ? (
                    <Button type="primary" onClick={stop} className={shumiStyles.stopButton}>
                      Stop
                    </Button>
                  ) : (
                    <Button type="primary" onClick={askAi} disabled={error != null || isGenerating} icon={<ArrowUpOutlined />} className={shumiStyles.sendButton} />
                  )}
                  <Button disabled={isGenerating || !messages.length || error != null} onClick={clearChat} className={shumiStyles.clearChatButton} icon={<PlusSquareOutlined />} />
                </>
              }
                          value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={disableInput ? undefined : askAi} // Disable Enter key only during submission
            ref={aiInputRef} // Use the specific ref for AI input
            spellCheck="false"
            disabled={error != null || disableInput} // Disable input on error OR during submission
            placeholder="Ask anything..."
            />
          </div>
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