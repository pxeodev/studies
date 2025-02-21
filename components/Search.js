import { Modal, Input, Button } from 'antd'
import { SearchOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'
import classnames from 'classnames'
import slugify from 'slugify'
import Fuse from 'fuse.js'
import { useChat } from 'ai/react'
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
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/ai',
    body: {
      walletAddress
    },
    query: {
      walletAddress // Add this to pass wallet address as query param
    }
  })
  const messagesEndRef = useRef(null)

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
    e.preventDefault(); // Add this to prevent default form submission
    if (!input.trim()) return; // Don't submit empty queries
    setMessages([]); // Clear previous messages before submitting new question
    handleSubmit(e)
  }, [handleSubmit, setMessages])
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
    <div className={searchStyles.aiTab}>
      <Input
        className={searchStyles.searchSelect}
        allowClear
        suffix={<Button onClick={askAi} loading={isLoading} disabled={isLoading}>Ask AI</Button>}
        value={input}
        onChange={handleInputChange}
        onPressEnter={askAi}
        ref={searchInputRef}
        spellCheck="false"
      />
      <div className={classnames(searchStyles.searchResults, searchStyles.aiAnswer)} ref={messagesEndRef}>
        {messages.length > 0 ? (
          <span className={searchStyles.ai}>
            <ReactMarkdown>
              {messages.filter(msg => msg.role === 'assistant').slice(-1)[0]?.content || (
                isLoading ? 'Thinking...' : ''
              )}
            </ReactMarkdown>
          </span>
        ) : (
          <div className={searchStyles.empty}>
            Ask AI a question about crypto
          </div>
        )}
      </div>
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

  const handleTabChange = useCallback((newTab) => {
    if (newTab === 'ai') {
      if (!walletAddress) {
        // Show NotConnected modal when no wallet is connected
        Modal.info({
          content: <NotConnected />,
          className: searchStyles.modal,
          footer: null,
        });
        return;
      }
      if (!hasKeyPass) {
        // Show NoKeyPass modal when wallet is connected but has no keypass
        Modal.info({
          content: <NoKeyPass />,
          className: searchStyles.modal,
          footer: null,
        });
        return;
      }
    }
    setTab(newTab);
  }, [hasKeyPass, walletAddress]);

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
            onClick={() => handleTabChange('search')}
          >
            Search
          </div>
          <div
            className={classnames(searchStyles.tab, {[searchStyles.active]: tab === 'ai'})}
            onClick={() => handleTabChange('ai')}
          >
            AI
          </div>
        </div>
        {content}
      </Modal>
    </div>
  );
}

export default Search