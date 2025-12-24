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

// Helper function to capitalize first letter
const capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Loading messages organized by phase
const LOADING_MESSAGES_BY_PHASE = {
  classifying: [
    "Checking the vibes",
    "Understanding your request",
    "Reading the signals",
    "Decoding your question",
    "Analyzing what you need"
  ],
  executing: [
    "Reading the signals",
    "Fetching fresh market data",
    "Sniffing for alpha",
    "Checking what chads are buying",
    "Scanning CT takes",
    "Reading the hopium charts",
    "Checking ser's bags",
    "Stalking whale wallets",
    "Measuring fud levels",
    "Checking if it's priced in",
    "Consulting the trend gods",
    "Scanning for exit liquidity",
    "Checking what's cooking on-chain",
    "Reading the tea leaves",
    "Aping into the data",
    "Hunting for gems",
    "Scanning the trenches",
    "Checking order books",
    "Summoning the charts",
    "Asking the oracles nicely",
    "Convincing APIs to respond",
    "Bribing the data gods",
    "Checking if devs are awake",
    "Reading degen sentiment",
    "Checking the rotations",
    "Sniffing out narratives",
    "Scanning for momentum",
    "Checking what's trending",
    "Reading whale moves",
    "Measuring conviction",
    "Checking funding rates",
    "Scanning perp action",
    "Reading the orderflow",
    "Checking what pumped",
    "Sniffing catalysts",
    "Measuring memecoin season",
    "Checking altszn indicators",
    "Reading macro vibes",
    "Scanning fresh wallets",
    "Checking what's cooking",
    "Reading the sentiment tea",
    "Checking CT alpha",
    "Scanning for setups",
    "Measuring greed levels",
    "Checking what's rotating",
    "Reading smart money",
    "Scanning for confluences",
    "Checking trend strength",
    "Measuring fomo intensity",
    "Reading volume signals",
    "Checking what insiders bought",
    "Scanning for breakouts",
    "Measuring conviction scores"
  ],
  generating: [
    "Finding the alpha 🍄",
    "Dropping some alpha",
    "Crafting your response",
    "Putting it all together",
    "Writing the analysis"
  ]
};

// Helper function to get messages for a phase
const getMessagesForPhase = (phase) => {
  if (phase && LOADING_MESSAGES_BY_PHASE[phase]) {
    return LOADING_MESSAGES_BY_PHASE[phase];
  }
  // Fallback to executing messages if phase is unknown
  return LOADING_MESSAGES_BY_PHASE.executing;
};

// Shumi-branded loading block with random message per phase
const ShumiLoadingBlock = ({ progress, requestId }) => {
  // Determine current phase from progress
  const currentPhase = progress?.phase || 'executing';

  // Pick ONE random message for this phase (changes when requestId changes)
  const displayMessage = useMemo(() => {
    // Use custom message from progress if it contains specific info (like level/totalLevels)
    if (progress?.level && progress?.totalLevels && progress?.message) {
      return capitalizeFirst(progress.message);
    }

    // Pick a random message for this phase using requestId as seed
    const phaseMessages = getMessagesForPhase(currentPhase);
    // Use requestId + phase to ensure different messages for different requests
    const seed = (requestId || 0) + (currentPhase || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomIndex = Math.floor(Math.abs(Math.sin(seed) * 10000) % phaseMessages.length);
    const selectedMessage = phaseMessages[randomIndex] || 'Shumi is thinking...';
    return capitalizeFirst(selectedMessage);
  }, [currentPhase, requestId, progress?.level, progress?.totalLevels, progress?.message]);

  const stepText = displayMessage;

  return (
    <div className={shumiStyles.shumiLoadingContainer}>
      <img
        className={shumiStyles.shumiLoadingMascot}
        src="/shumi.png"
        alt="Shumi"
        width="18"
        height="18"
      />
      <span className={shumiStyles.shumiLoadingText}>{stepText}</span>
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
  const requestIdRef = useRef(0); // Track request ID for randomization
  const progressRequestIdRef = useRef(0); // Track request ID for randomization

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
        console.log('[Shumi] Progress update:', dataPart.data);
        setProgress(dataPart.data);
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

  const askAi = useCallback(async (e) => {
    if (e) e.preventDefault();
    setProgress(null); // Clear previous progress
    requestIdRef.current += 1; // Increment request ID for new request

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
               {/* Show Shumi loading block when progress exists or when waiting for response */}
               {(() => {
                 // Check only the last message (the one currently being generated) for content
                 const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                 const hasCurrentAssistantContent = lastMessage && lastMessage.role === 'assistant' && (
                   (lastMessage.content && lastMessage.content.trim()) ||
                   (lastMessage.parts && lastMessage.parts.some(part => part.type === 'text' && part.text && part.text.trim()))
                 );
                 const shouldShow = (progress || (status === 'submitted' || status === 'streaming')) && !hasCurrentAssistantContent;
                 return shouldShow ? <ShumiLoadingBlock progress={progress} requestId={requestIdRef.current} /> : null;
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