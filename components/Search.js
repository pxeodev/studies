import { Modal, Input, Tag } from 'antd'
import { SearchOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'
import classnames from 'classnames'
import slugify from 'slugify'
import Fuse from 'fuse.js'
import searchStyles from '../styles/search.module.less'
import Shumi from './Shumi'

const Search = ({ categories, collapsed }) => {
  const [coins, setCoins] = useState([])
  const [tab, setTab] = useState('search');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState(searchValue);
  const searchInputRef = useRef(null)
  const [fuseCoinIndex, setFuseCoinIndex] = useState(undefined)
  const [modifierKey, setModifierKey] = useState('⌘')

  const router = useRouter()

  useEffect(() => {
    const fetchCoins = async () => {
      const res = await fetch('/api/search')
      const { coins } = await res.json()
      setCoins(coins)
      setFuseCoinIndex(Fuse.createIndex(['name', 'symbol', 'contract'], coins))
    }
    fetchCoins()
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalVisible(true)
      }
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
         e.preventDefault();
        setSearchModalVisible(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (searchModalVisible) {
      if (tab === 'search' && searchInputRef.current) {
        setTimeout(() => searchInputRef.current.focus(), 100)
      }
    }
  }, [searchModalVisible, tab])

  const setQueryDebounced = useCallback(debounce(setQuery, 250), []);

  const openSearchModal = useCallback(() => {
    setSearchModalVisible(true)
  }, []);

  const onSearchValueChange = useCallback((e) => {
    setSearchValue(e.target.value);
    setQueryDebounced(e.target.value.trim().toLowerCase());
  }, [setSearchValue, setQueryDebounced]);

  const closeModal = useCallback(() => {
    setSearchModalVisible(false)
    setSearchValue('')
    setQuery('')
    setTab('search');

    if (window.location.hash === '#shumi') {
      const pathWithoutHash = router.asPath.split('#')[0];
      router.push(pathWithoutHash, undefined, { shallow: true });
    }
  }, [router]);

  useEffect(() => {
    const path = router.asPath
    const afterHash = path.split('#')[1]
    if (afterHash === 'shumi' && !searchModalVisible) {
      setSearchModalVisible(true)
      setTab('ai')
    } else if (afterHash !== 'shumi' && searchModalVisible && tab === 'ai') {
    }
  }, [router.asPath, searchModalVisible, tab])

  useEffect(() => {
    // Determine the modifier key based on the operating system
    // Use navigator.userAgent as navigator.platform is deprecated and userAgentData has limited support
    const userAgent = navigator?.userAgent?.toLowerCase() || '';
    if (userAgent.includes('win') || userAgent.includes('linux')) {
      setModifierKey('Ctrl+')
    } else if (userAgent.includes('mac')) {
      setModifierKey('⌘')
    } // Keep default '⌘' if detection fails or for other OS
  }, [])

  let searchTrigger = <div onClick={openSearchModal} className={searchStyles.searchBarWrapper}>
    <Input
      className={searchStyles.searchBar}
      prefix={<>
        <SearchOutlined className={searchStyles.placeholderMagnifier} />
        <span className={searchStyles.placeholderText}>Search</span>
      </>}
      suffix={
        <Tag className={searchStyles.shortcutTag}>
          {modifierKey}K
        </Tag>
      }
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
          filteredCoins.slice(0, 10).map((coin) => {
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
          filteredCategories.slice(0, 5).map((category) => {
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

  let searchResultsContent = <>
    {coinOptions}
    {categoryOptions}
  </>
  if (query === '') {
    searchResultsContent = <div className={searchStyles.empty}>
      Search for&nbsp;
      <span className={searchStyles.noQueryHighlight}>Coin name, Category, Contract Address</span>
    </div>
  } else if (filteredCoins.length === 0 && filteredCategories.length === 0) {
    searchResultsContent = <div className={searchStyles.empty}>
      No results found for "{query}".
    </div>
  }

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
        placeholder="Search coins, categories..."
      />
      <div className={searchStyles.searchResults}>
        {searchResultsContent}
      </div>
    </>
  ) : (
    <Shumi isActive={tab === 'ai'} />
  );

  return (
    <>
      {searchTrigger}
      <Modal
        open={searchModalVisible}
        onCancel={closeModal}
        afterClose={() => {
          if (window.location.hash === '#shumi') {
            const pathWithoutHash = router.asPath.split('#')[0];
            if (router.asPath !== pathWithoutHash) {
                router.push(pathWithoutHash, undefined, { shallow: true });
            }
          }
          setTab('search');
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
            <img src="/shumi.png" alt="Shumi" width="18" height="18" />Shumi
          </div>
        </div>
        <div className={searchStyles.contentWrapper}>
            {content}
        </div>
      </Modal>
    </>
  );
};

export default Search