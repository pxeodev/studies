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
import ShumiCopyButton from './ShumiCopyButton'
import { Suggestion, Suggestions } from './ai-elements/suggestion'

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
    <div className={shumiStyles.shumiLoadingContainer}>
      <img
        className={shumiStyles.shumiLoadingMascot}
        src="/shumi.png"
        alt="Shumi"
        width="18"
        height="18"
        style={{ width: '18px', height: '18px', maxWidth: '18px', maxHeight: '18px' }}
      />
      <span className={shumiStyles.shumiLoadingText}>{getMessage()}</span>
    </div>
  );
};

// Helper function to generate session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

const Shumi = ({ isActive, initialSuggestions }) => {
  const { loggedIn, getAccounts, login } = useWeb3Auth()
  const [walletAddress, setWalletAddress] = useState(null)
  const [coinTag, setCoinTag] = useState(null);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const [aiGeneratedSuggestions, setAiGeneratedSuggestions] = useState(null); // Store AI-generated suggestions for last message
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [isClient, setIsClient] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState(null); // Store prompt to submit after login

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
    onError: (error) => {
      console.error('Shumi error:', error);
    },
    onData: (dataPart) => {
      // Handle transient progress updates via onData callback (v5 best practice)
      if (dataPart.type === 'data-progress') {
        setProgress(dataPart.data);
      } else if (dataPart.type === 'data-suggestions') {
        // Store AI-generated suggestions for the last assistant message
        console.log('[Shumi] Received suggestions data:', dataPart.data);
        setAiGeneratedSuggestions(dataPart.data.suggestions);
      }
    }
  });

  // Submit pending prompt after successful login
  useEffect(() => {
    if (walletAddress && pendingPrompt && sendMessage) {
      // Wait a bit for wallet address to be fully set in transport
      const timer = setTimeout(() => {
        const { text, coinId, browserDateTimeWithTimezone } = pendingPrompt;
        sendMessage({
          text
        }, {
          body: {
            walletAddress,
            data: {
              browserDateTimeWithTimezone,
              sessionId,
              ...(coinId ? { coinId } : {})
            }
          }
        });
        setPendingPrompt(null); // Clear pending prompt
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [walletAddress, pendingPrompt, sendMessage, sessionId]);
  const messagesEndRef = useRef(null)
  const aiInputRef = useRef(null)
  const hasScrolledToSuggestionsRef = useRef(false) // Track if we've scrolled to suggestions to prevent multiple scrolls
  const lastMessageCountRef = useRef(0) // Track message count to detect new messages
  const userScrolledAfterStreamingRef = useRef(false) // Track if user manually scrolled after streaming completed


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
        // Strip JSON suggestions block from content if present (including partial blocks during streaming)
        // Try multiple patterns to catch complete and partial JSON blocks
        let cleanedContent = content
          // Remove complete JSON blocks with code fences
          .replace(/```json\s*\{[\s\S]*?"suggestions"[\s\S]*?\}\s*```/g, '')
          // Remove any text starting with ```json (catches partial blocks during streaming)
          .replace(/```json[\s\S]*$/g, '')
          // Remove any remaining JSON-like structures with "suggestions" (even if incomplete)
          .replace(/\{[\s\S]*?"suggestions"[\s\S]*?\}/g, '')
          // Also catch if content ends with partial JSON (e.g., just ```json or ```json\n{)
          .replace(/```json\s*\{?\s*$/g, '')
          .trim();

        // Fix markdown headings after colons/periods only in assistant messages
        cleanedContent = cleanedContent.includes(':#') || cleanedContent.includes('.#')
          ? cleanedContent.replace(/([:.])(\s*)#/g, '$1\n\n#')
          : cleanedContent;

        return {
          ...message,
          content, // Keep original content
          processedContent: cleanedContent
        };
      }
      return {
        ...message,
        content: content || message.content || '', // Ensure content exists
        processedContent: content || message.content || ''
      };
    });

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

  // Clear progress when the current assistant message (last message) has content
  useEffect(() => {
    // Only check the last message (the one currently being generated)
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const hasCurrentAssistantContent = lastMessage && lastMessage.role === 'assistant' && (
      (lastMessage.content && lastMessage.content.trim()) ||
      (lastMessage.parts && lastMessage.parts.some(part => part.type === 'text' && part.text && part.text.trim()))
    );

    if (hasCurrentAssistantContent && progress) {
      setProgress(null);
    }
  }, [messages, progress]);

  // Track previous status to avoid unnecessary updates
  const previousStatusRef = useRef(status);

  // Clear AI suggestions when streaming starts (new message being generated)
  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    const currentStatus = status;
    previousStatusRef.current = currentStatus;

    // Only clear if status changed TO streaming/submitted FROM a non-streaming state
    // This prevents clearing on every status update
    const justStartedStreaming = (currentStatus === 'streaming' || currentStatus === 'submitted') &&
                                  prevStatus !== 'streaming' && prevStatus !== 'submitted';

    if (justStartedStreaming && aiGeneratedSuggestions) {
      console.log('[Shumi] Clearing suggestions because streaming started, status:', currentStatus);
      setAiGeneratedSuggestions(null);
    }
  }, [status, aiGeneratedSuggestions]); // Include aiGeneratedSuggestions to avoid stale closure

  const askAi = useCallback(async (e) => {
    if (e) e.preventDefault();
    setProgress(null); // Clear previous progress
    setAiGeneratedSuggestions(null); // Clear previous AI suggestions when sending new message
    hasScrolledToSuggestionsRef.current = false; // Reset scroll flag when sending new message

    if (!input.trim() && !coinTag) return;

    // Check if user is logged in
    if (!loggedIn || !walletAddress) {
      // Store the prompt to submit after login
      const coinId = document.querySelector('meta[property="x-cr-coin-id"]')?.content;
      const browserDateTimeWithTimezone = new Date().toString();
      setPendingPrompt({
        text: input.trim(),
        coinId: coinTag && coinId ? coinId : undefined,
        browserDateTimeWithTimezone
      });
      // Clear input
      setInput('');
      // Trigger login
      try {
        await login();
      } catch (error) {
        console.error('Login failed:', error);
        setPendingPrompt(null); // Clear pending prompt on login failure
      }
      return;
    }

    // User is logged in, proceed with normal submission
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
  }, [sendMessage, input, coinTag, sessionId, loggedIn, walletAddress, login]);

  // Handle removing the coin tag
  const handleRemoveCoinTag = useCallback(() => {
    setCoinTag(null);
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = lastMessageCountRef.current;

    // If message count increased, user sent a new message - reset scroll tracking
    if (currentMessageCount > previousMessageCount) {
      console.log('[Shumi] New message detected, resetting scroll tracking. Previous:', previousMessageCount, 'Current:', currentMessageCount);
      hasScrolledToSuggestionsRef.current = false;
      lastMessageCountRef.current = currentMessageCount;
    }

    if (messagesEndRef.current) {
        // Simple scroll to bottom - relies on CSS overflow-anchor for pinning
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]); // Run whenever messages change

  // Scroll to show suggestions when they appear (only if user is near bottom and streaming is complete)
  useEffect(() => {
    // Only scroll when streaming is complete and suggestions are available
    const isStreamingComplete = !(status === 'streaming' || status === 'submitted');

    console.log('[Shumi] Suggestions scroll effect:', {
      hasSuggestions: !!aiGeneratedSuggestions,
      suggestionsCount: aiGeneratedSuggestions?.length || 0,
      isStreamingComplete,
      status,
      hasContainer: !!messagesEndRef.current,
      hasScrolledAlready: hasScrolledToSuggestionsRef.current
    });

    // Reset scroll flag when suggestions are cleared
    if (!aiGeneratedSuggestions || aiGeneratedSuggestions.length === 0) {
      hasScrolledToSuggestionsRef.current = false;
      return;
    }

    if (aiGeneratedSuggestions && aiGeneratedSuggestions.length > 0 && isStreamingComplete && messagesEndRef.current) {
      const container = messagesEndRef.current;
      const scrollHeight = container.scrollHeight;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Check if user is near the bottom (within 200px) before auto-scrolling
      // Increase threshold to be more permissive - if user just finished reading streamed content,
      // they're likely near the bottom even if scrollTop is 0 (content might not have fully rendered yet)
      const isNearBottom = distanceFromBottom < 200;

      // Also check if scrollTop is very low (0 or near 0) - this means content just finished rendering
      // and user hasn't scrolled up manually, so we should scroll to show suggestions
      const isAtTop = scrollTop < 50;

      console.log('[Shumi] Scroll check:', {
        scrollHeight,
        scrollTop,
        clientHeight,
        distanceFromBottom,
        isNearBottom,
        isAtTop,
        hasScrolledAlready: hasScrolledToSuggestionsRef.current
      });

      // Always scroll the first time suggestions appear for a new message
      // The flag is reset when a new message is sent, so this ensures we scroll for new conversations
      if (!hasScrolledToSuggestionsRef.current) {
        console.log('[Shumi] Scrolling to show suggestions (first time for this message)...');
        hasScrolledToSuggestionsRef.current = true; // Mark as scrolled

        // Use requestAnimationFrame to ensure DOM has updated, then scroll
        requestAnimationFrame(() => {
          if (container) {
            // Small delay to ensure suggestions are fully rendered in DOM
            setTimeout(() => {
              if (container) {
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = newScrollHeight;
                console.log('[Shumi] ✓ Scrolled to show suggestions:', {
                  scrollTop: container.scrollTop,
                  scrollHeight: newScrollHeight,
                  clientHeight: container.clientHeight,
                  finalDistanceFromBottom: newScrollHeight - container.scrollTop - container.clientHeight
                });
              }
            }, 300); // Delay to ensure DOM is ready
          }
        });
      } else {
        console.log('[Shumi] Not scrolling - already scrolled to these suggestions');
      }
    }
  }, [aiGeneratedSuggestions, status]); // Run when suggestions appear or status changes

  // Render gating or chat UI
  let content;
  // Show loading state during hydration to prevent hydration mismatch
  if (!isClient) {
    content = <div className={shumiStyles.gatingContainer}><div>Loading...</div></div>;
  } else {
    // Always show the Shumi interface, even when not logged in
    // Sign-in will be triggered when user submits a prompt
    content = (
      <>
        <div className={shumiStyles.conversationArea} ref={messagesEndRef}>
          {messages.length > 0 ? (
             <>
               {processedMessages
                 .filter(message => {
                   // Filter out empty assistant messages (they'll show up once content arrives)
                   if (message.role === 'assistant') {
                     const hasContent = (message.processedContent && message.processedContent.trim()) ||
                                       (message.content && message.content.trim()) ||
                                       (message.parts && message.parts.some(part => part.type === 'text' && part.text && part.text.trim()));
                     return hasContent;
                   }
                   return true; // Always show user messages
                 })
                 .map((message, index) => (
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
               {/* Display AI-generated suggestions below the last assistant message */}
               {(() => {
                 const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                 const isLastAssistant = lastMessage && lastMessage.role === 'assistant';
                 const isStreamingComplete = !(status === 'streaming' || status === 'submitted');

                 if (isLastAssistant && isStreamingComplete && aiGeneratedSuggestions && aiGeneratedSuggestions.length > 0) {
                   return (
                     <div className={shumiStyles.aiSuggestionsContainer}>
                       <Suggestions>
                         {aiGeneratedSuggestions.map((suggestion, index) => (
                           <Suggestion
                             key={index}
                             suggestion={suggestion}
                             onClick={(suggestion) => {
                               setInput(suggestion);
                               // Optionally auto-submit: sendMessage({ text: suggestion }, {...})
                             }}
                           />
                         ))}
                       </Suggestions>
                     </div>
                   );
                 }
                 return null;
               })()}
               {/* Show Shumi loading block when progress exists or when waiting for response */}
               {(() => {
                 // Check only the last message (the one currently being generated) for content
                 const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                 const hasCurrentAssistantContent = lastMessage && lastMessage.role === 'assistant' && (
                   (lastMessage.content && lastMessage.content.trim()) ||
                   (lastMessage.parts && lastMessage.parts.some(part => part.type === 'text' && part.text && part.text.trim()))
                 );
                 const shouldShow = (progress || (status === 'submitted' || status === 'streaming')) && !hasCurrentAssistantContent;
                 return shouldShow ? <ShumiLoadingBlock progress={progress} /> : null;
               })()}

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
            <Suggestions>
              {currentSuggestions.map((suggestion, index) => (
                <Suggestion
                  key={index}
                  suggestion={suggestion}
                  onClick={(suggestion) => setInput(suggestion)}
                />
              ))}
            </Suggestions>
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