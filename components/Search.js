import { Modal, Input, Button, Tag } from 'antd'
import { SearchOutlined, MessageOutlined, PlusSquareOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'
import classnames from 'classnames'
import slugify from 'slugify'
import Fuse from 'fuse.js'
import { useChat } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import useKeyPass from '../hooks/useKeyPass';
import useAccount from '../hooks/useAccount';
import searchStyles from '../styles/search.module.less'
import NoKeyPass from './gating/NoKeyPass'
import NotConnected from './gating/NotConnected'

const Search = ({ categories, collapsed }) => {
  const hasKeyPass = useKeyPass()
  const walletAddress = useAccount()
  const [coins, setCoins] = useState([])
  const [tab, setTab] = useState('search');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState(searchValue);
  const searchInputRef = useRef(null)
  const [fuseCoinIndex, setFuseCoinIndex] = useState(undefined)
  const [AIAnswer, setAIAnswer] = useState('')
  const [coinTag, setCoinTag] = useState(null);
  const { messages, input, handleInputChange, handleSubmit, stop, isLoading, setMessages, setInput, error, reload } = useChat({
    api: '/api/ai',
    body: {
      walletAddress
    },
    query: {
      walletAddress // Add this to pass wallet address as query param
    }
  })
  const messagesEndRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true);

  const aiSuggestions = [
    "Show coins that just started an uptrend",
    "Compare AI vs RWA trends today",
    "Find coins under $100M market cap with a daily (1d) uptrend"
  ];

  const router = useRouter()

  useEffect(() => {
    const fetchCoins = async () => {
      const res = await fetch('/api/search')
      const { coins } = await res.json()
      setCoins(coins)
      setFuseCoinIndex(Fuse.createIndex(['name', 'symbol', 'contract'], coins))
    }
    fetchCoins()
    const eventRef = document.addEventListener('keydown', (e) => {
      if (e.key === '/') {
        setSearchModalVisible(true)
      }
    })
    return () => {
      document.removeEventListener('keydown', eventRef)
    }
  }, [])
  useEffect(() => {
    if (searchModalVisible) {
      setTimeout(
        () => searchInputRef.current.focus(),
        100
      )
    }
  }, [searchModalVisible])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setQueryDebounced = useCallback(debounce(setQuery, 250), []);
  const openSearchModal = useCallback(() => {
    setSearchModalVisible(true)
  }, []);
  const clearChat = useCallback(() => {
    setMessages([])
    setInput('')
  }, [setMessages, setInput])
  const onSearchValueChange = useCallback((e) => {
    setAIAnswer('')
    setSearchValue(e.target.value);
    setQueryDebounced(e.target.value.trim().toLowerCase());
  }, [setSearchValue, setQueryDebounced]);
  const closeModal = useCallback(() => {
    setSearchModalVisible(false)
    setSearchValue('')
    setQuery('')
    setCoinTag(null)

    // Remove the hash from the URL when closing the modal
    if (window.location.hash === '#toady') {
      // Get the current path without the hash
      const pathWithoutHash = router.asPath.split('#')[0];
      // Use Next.js router to remove the hash without page reload
      router.push(pathWithoutHash, undefined, { shallow: true });
    }
  }, [router]);
  const askAi = useCallback((e) => {
    e.preventDefault();

    if (!input.trim() && !coinTag) return;
    const coinId = document.querySelector('meta[property="x-cr-coin-id"]');
    const currentDateTime = new Date().toString();

    handleSubmit(e, {
      data: {
        timestamp: currentDateTime,
        ...(coinTag ? { coinId } : {})
      }
    });
  }, [handleSubmit, input, coinTag]);

  // Handle removing the coin tag
  const handleRemoveCoinTag = useCallback(() => {
    setCoinTag(null);
  }, []);

  useEffect(() => {
    // Only auto-scroll when new messages arrive if autoScroll is true
    if (messages.length > 0 && autoScroll) {
      // Use setTimeout to ensure this happens after render
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages, autoScroll]);

  // Separate effect to handle user scroll and detect when to enable/disable auto-scroll
  useEffect(() => {
    const messagesContainer = messagesEndRef.current;
    if (!messagesContainer) return;

    // When a new message is added, we want to enable auto-scroll
    if (messages.length > 0) {
      // Check if we're already at the bottom before enabling auto-scroll
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;

      // Only set autoScroll to true if we're already at the bottom
      if (isAtBottom) {
        setAutoScroll(true);
      }
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;

      // Only update if we're changing the state
      if (autoScroll !== isAtBottom) {
        setAutoScroll(isAtBottom);
      }
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, [messages, autoScroll]);

  // Add effect to check for hash in URL
  useEffect(() => {
    const path = router.asPath
    const afterHash = path.split('#')[1]
    if (afterHash === 'toady') {
      setSearchModalVisible(true)
      setTab('ai')
    }
  }, [router.asPath])

  // Check if we're on a coin page and set the coin tag
  useEffect(() => {
    const coinMetaTag = document.querySelector('meta[property="x-cr-coin-name"]');
    if (coinMetaTag && coinMetaTag.content) {
      setCoinTag(coinMetaTag.content);
    }
  }, [router.asPath]);

  let searchTrigger = <div onClick={openSearchModal} className={searchStyles.searchBarWrapper}>
    <Input
      className={searchStyles.searchBar}
      prefix={<>
        <SearchOutlined className={searchStyles.placeholderMagnifier} />
        <span className={searchStyles.placeholderText}>Search</span>
      </>}
      disabled
    />
  </div>
  if (collapsed) {
    searchTrigger = <div onClick={openSearchModal} className={searchStyles.searchIcon} >
      <SearchOutlined className={searchStyles.placeholderMagnifier} />
    </div>
  }
  let coinOptions = null
  let filteredCoins
  if (query?.length === 2) {
    filteredCoins = coins.filter(coin => coin.name.toLowerCase().startsWith(query.toLowerCase()) || coin.symbol.toLowerCase().startsWith(query.toLowerCase()))
  } else {
    filteredCoins = new Fuse(
      coins,
      {
        keys: [
          { name: 'contract', weight: 0.1 },
          { name: 'symbol', weight: 0.9 },
          { name: 'name', weight: 0.1 }
        ],
        minMatchCharLength: 2,
        threshold: 0.3,
        distance: 0
      },
      fuseCoinIndex
    ).search(query).map((result) => result.item)
  }
  if (filteredCoins.length > 0) {
    coinOptions = (
      <>
        <div className={searchStyles.optionTitle}>Coins</div>
        {
          filteredCoins.map((coin) => {
            return (
              <div
                className={classnames(searchStyles.option, searchStyles.coinOption)}
                key={coin.id}
                onClick={() => {
                  closeModal();
                  router.push(`/coin/${coin.id}`)}
                }>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coin.image} alt={coin.name}/>
                <span className={searchStyles.coinName}>{coin.name}</span>
                <span className={searchStyles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
              </div>
            )
          })
        }
      </>
    )
  }

  let categoryOptions = null
  let filteredCategories
  if (query?.length === 2) {
    filteredCategories = categories.filter(category => category.toLowerCase().startsWith(query.toLowerCase()))
  } else {
    filteredCategories = new Fuse(
      categories,
      {
        minMatchCharLength: 3,
        threshold: 0.1,
        ignoreLocation: true
      },
      ).search(query).map((result) => result.item)
  }
  if (filteredCategories.length > 0) {
    categoryOptions = (
      <>
        <div className={searchStyles.optionTitle}>Categories</div>
        {
          filteredCategories.map((category) => {
            return (
              <div
                className={classnames(searchStyles.option, searchStyles.categoryOption)}
                key={category}
                onClick={() => {
                  closeModal();
                  const categorySlug = slugify(category)
                  router.push(`/category/${categorySlug}`)}
                }>
                <span className={searchStyles.categoryOption}>{category}</span>
              </div>
            )
          })
        }
      </>
    )
  }

  let results = <>
    {coinOptions}
    {categoryOptions}
  </>
  if (query === '') {
    results = <div className={searchStyles.empty}>
      Search for&nbsp;
      <span className={searchStyles.noQueryHighlight}>Coin name, Category, Contract Address</span>
    </div>
  } else if (AIAnswer) {
    results = <span className={searchStyles.ai}>{AIAnswer}</span>
  } else if (filteredCoins.length === 0 && filteredCategories.length === 0) {
    results = <div className={searchStyles.empty}>
      No results.
    </div>
  }

  const aiTabContent = (
    <div className={classnames(searchStyles.aiTab, {
      [searchStyles.aiTabPadding]: !walletAddress || !hasKeyPass
    })}>
      {!walletAddress ? (
        <NotConnected />
      ) : !hasKeyPass ? (
        <NoKeyPass />
      ) : (
        <>
          <div className={classnames(searchStyles.searchResults, searchStyles.aiAnswer)} ref={messagesEndRef}>
            {messages.length > 0 ? (
              <div className={searchStyles.conversationHistory}>
                {messages.map((message, index) => (
                  <div key={index} className={classnames(searchStyles.messageContainer, {
                    [searchStyles.userMessage]: message.role === 'user',
                    [searchStyles.assistantMessage]: message.role === 'assistant'
                  })}>
                    {message.role === 'assistant' && (
                      <div className={searchStyles.messageRole}>
                        <img className={searchStyles.toadAiIcon} src="/toad-ai.png" alt="Toady" width="18" height="18" />&nbsp;Toady
                      </div>
                    )}
                    <div className={searchStyles.messageContent}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className={searchStyles.assistantMessage}>
                    <div className={searchStyles.messageRole}><img className={searchStyles.toadAiIcon} src="/toad-ai.png" alt="Toady" width="18" height="18" />&nbsp;Toady</div>
                    <div className={searchStyles.messageContent}>Thinking...</div>
                  </div>
                )}

                {/* Add error display */}
                {error && (
                  <div className={searchStyles.assistantMessage}>
                    <div className={searchStyles.messageRole}><img className={searchStyles.toadAiIcon} src="/toad-ai.png" alt="Toady" width="18" height="18" />&nbsp;Toady</div>
                    <div className={searchStyles.messageContent}>
                      <div>Something went wrong.</div>
                      <Button type="primary" onClick={() => reload()} className={searchStyles.retryButton}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={searchStyles.suggestions}>
                <div className={searchStyles.suggestionTitle}>Suggestions:</div>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={searchStyles.suggestionButton}
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input
            className={searchStyles.searchSelect}
            allowClear
            prefix={<>
              <MessageOutlined className={searchStyles.placeholderMagnifier}/>
              {coinTag && (
                <Tag
                  className={searchStyles.coinTag}
                  closable
                  onClose={handleRemoveCoinTag}
                >
                  {coinTag}
                </Tag>
              )}
            </>}
            suffix={
              <>
                {isLoading ? (
                  <Button type="primary" onClick={stop} className={searchStyles.stopButton}>
                    Stop
                  </Button>
                ) : (
                  <Button type="primary" onClick={askAi} disabled={error != null}>
                    Ask Toady
                  </Button>
                )}
                <Button disabled={isLoading || !messages.length || error != null} onClick={clearChat} className={searchStyles.clearChatButton} icon={<PlusSquareOutlined />} />
              </>
            }
            value={input}
            onChange={handleInputChange}
            onPressEnter={askAi}
            ref={searchInputRef}
            spellCheck="false"
            disabled={error != null}
          />
        </>
      )}
    </div>
  );

  const content = tab === 'search' ? (
    <>
      <Input
        className={classnames(searchStyles.searchSelect, searchStyles.classicSearchSelect)}
        allowClear
        prefix={<SearchOutlined className={searchStyles.placeholderMagnifier}/>}
        value={searchValue}
        onChange={onSearchValueChange}
        ref={searchInputRef}
        spellCheck="false"
      />
      <div className={searchStyles.searchResults}>
        {results}
      </div>
    </>
  ) : aiTabContent;

  return (
    <div>
      {searchTrigger}
      <Modal
        open={searchModalVisible}
        onCancel={closeModal}
        afterClose={() => {
          if (window.location.hash === '#toady') {
            const pathWithoutHash = router.asPath.split('#')[0];
            router.push(pathWithoutHash, undefined, { shallow: true });
          }
        }}
        className={searchStyles.modal}
        footer={null}
        closeIcon={null}
      >
        <div className={searchStyles.tabs}>
          <div
            className={classnames(searchStyles.tab, {[searchStyles.active]: tab === 'search'})}
            onClick={() => setTab('search')}
          >
            Search
          </div>
          <div
            className={classnames(searchStyles.tab, {[searchStyles.active]: tab === 'ai'})}
            onClick={() => setTab('ai')}
          >
            <img src="/toad-ai.png" alt="Toady" width="18" height="18" />&nbsp;Toady
          </div>
        </div>
        {content}
      </Modal>
    </div>
  );
};

export default Search