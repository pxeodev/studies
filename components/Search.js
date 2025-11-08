import { Modal, Input, Tag } from 'antd'
import { SearchOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'
import classnames from 'classnames'
import slugify from 'slugify'
import Fuse from 'fuse.js'
import round from 'lodash/round'
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
  const [coinData, setCoinData] = useState({}) // Stores fetched price/trend data by coin.id
  const [loadingData, setLoadingData] = useState(false)
  const coinDataCacheRef = useRef({}) // Cache with timestamps

  const router = useRouter()
  
  const currencyFormatter = useMemo(() => new Intl.NumberFormat([], { 
    style: 'currency', 
    currency: 'usd', 
    currencyDisplay: 'narrowSymbol', 
    maximumFractionDigits: 9 
  }), [])
  
  const numberFormatter = useMemo(() => new Intl.NumberFormat([], { 
    notation: 'compact', 
    compactDisplay: 'short', 
    maximumFractionDigits: 2 
  }), [])

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

  // Fetch coin data from AI API (on-demand)
  const fetchCoinData = useCallback(async (coinNames) => {
    const CACHE_DURATION = 30000 // 30 seconds
    const now = Date.now()
    const newCoinData = {}
    const coinsToFetch = []

    // Check cache first
    for (const name of coinNames) {
      const cached = coinDataCacheRef.current[name]
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        newCoinData[cached.id] = cached.data
      } else {
        coinsToFetch.push(name)
      }
    }

    // Fetch uncached coins in parallel
    if (coinsToFetch.length > 0) {
      setLoadingData(true)
      try {
        const results = await Promise.all(
          coinsToFetch.map(name =>
            fetch(`https://coinrotator-ai.onrender.com/api/coin/name?name=${encodeURIComponent(name)}`)
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          )
        )

        results.forEach((result, index) => {
          if (result && result.coin) {
            const coinName = coinsToFetch[index]
            const coinId = result.coin.id
            
            // Extract latest trend
            const latestTrend = result.trends && result.trends.length > 0 
              ? result.trends[result.trends.length - 1] 
              : null

            const data = {
              price: result.coin.currentPrice,
              trend: latestTrend ? latestTrend.trend : null,
              streak: latestTrend ? latestTrend.streak : 0
            }

            newCoinData[coinId] = data
            
            // Update cache
            coinDataCacheRef.current[coinName] = {
              id: coinId,
              data,
              timestamp: now
            }
          }
        })
      } catch (error) {
        console.error('Error fetching coin data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    setCoinData(prevData => ({ ...prevData, ...newCoinData }))
  }, [])

  // Fetch coin data when filtered results change
  useEffect(() => {
    let filteredCoins
    if (query?.length === 2) {
      filteredCoins = coins.filter(coin => coin.name.toLowerCase().startsWith(query.toLowerCase()) || coin.symbol.toLowerCase().startsWith(query.toLowerCase()))
    } else if (query?.length > 2) {
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

    if (filteredCoins && filteredCoins.length > 0) {
      // Limit to top 5 for performance
      const topCoins = filteredCoins.slice(0, 5)
      const coinNames = topCoins.map(coin => coin.name)
      
      // Debounce the fetch to avoid too many requests
      const timeoutId = setTimeout(() => {
        fetchCoinData(coinNames)
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [query, coins, fuseCoinIndex, fetchCoinData])

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
          filteredCoins.slice(0, 5).map((coin) => {
            // Get fetched data for this coin
            const data = coinData[coin.id]
            
            // Parse price (comes as "$101981" from API)
            let price = null
            if (data?.price) {
              const priceStr = data.price.replace(/[$,]/g, '')
              price = parseFloat(priceStr)
            }
            
            // Get trend from fetched data
            const trendType = data?.trend
            const streak = data?.streak || 0
            
            // Calculate trend indicator
            let trendIndicator = null
            if (trendType && trendType !== 'HODL') {
              const isUp = trendType === 'UP'
              const isDown = trendType === 'DOWN'
              
              if (isUp || isDown) {
                trendIndicator = (
                  <span className={classnames(searchStyles.trendIndicator, {
                    [searchStyles.trendUp]: isUp,
                    [searchStyles.trendDown]: isDown
                  })}>
                    {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {streak > 1 && <span className={searchStyles.streak}>{streak}</span>}
                  </span>
                )
              }
            }

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
                <div className={searchStyles.coinMetadata}>
                  <span className={searchStyles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
                  {coin.marketCapRank && (
                    <Tag className={searchStyles.rankBadge}>#{coin.marketCapRank}</Tag>
                  )}
                  {trendIndicator}
                  {price && !isNaN(price) && (
                    <span className={searchStyles.price}>
                      {currencyFormatter.format(price)}
                    </span>
                  )}
                  {coin.marketCap && (
                    <span className={searchStyles.marketCap}>
                      {numberFormatter.format(coin.marketCap)}
                    </span>
                  )}
                </div>
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