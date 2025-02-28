import { Modal, Input, Button } from 'antd'
import { SearchOutlined, MessageOutlined, PlusSquareOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'
import classnames from 'classnames'
import slugify from 'slugify'
import Fuse from 'fuse.js'
import { useChat } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'

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
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput } = useChat({
    api: '/api/ai',
    body: {
      walletAddress
    },
    query: {
      walletAddress // Add this to pass wallet address as query param
    }
  })
  const messagesEndRef = useRef(null)

  const aiSuggestions = [
    "What are some of the rising DeFi tokens right now?",
    "What's ETH price prediction for upcoming years?",
    "What are memecoins and are they worth it?"
  ];

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
  }, []);
  const askAi = useCallback((e) => {
    e.preventDefault();
    if (!input.trim()) return;

    handleSubmit(e);
  }, [handleSubmit, input]);
  const router = useRouter()

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollTo({
        top: messagesEndRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

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
          <Input
            className={searchStyles.searchSelect}
            allowClear
            prefix={<MessageOutlined className={searchStyles.placeholderMagnifier}/>}
            suffix={
              <>
                <Button type="primary" onClick={askAi} loading={isLoading} className={isLoading ? searchStyles.askToadButtonDisabled : ''}>Ask Toad</Button>
                <Button disabled={isLoading || !messages.length} onClick={clearChat} className={searchStyles.clearChatButton} icon={<PlusSquareOutlined />} />
              </>
            }
            value={input}
            onChange={handleInputChange}
            onPressEnter={askAi}
            ref={searchInputRef}
            spellCheck="false"
          />
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
                        <img src="/toad-ai.png" alt="Toad AI" width="18" height="18" />&nbsp;Toad AI
                      </div>
                    )}
                    <div className={searchStyles.messageContent}>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className={searchStyles.assistantMessage}>
                    <div className={searchStyles.messageRole}><img src="/toad-ai.png" alt="Toad AI" width="18" height="18" />&nbsp;Toad AI</div>
                    <div className={searchStyles.messageContent}>Thinking...</div>
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
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const content = tab === 'search' ? (
    <>
      <Input
        className={searchStyles.searchSelect}
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
        onCancel={() => setSearchModalVisible(false)}
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
            <img src="/toad-ai.png" alt="Toad AI" width="18" height="18" />&nbsp;Toad AI
          </div>
        </div>
        {content}
      </Modal>
    </div>
  );
}

export default Search