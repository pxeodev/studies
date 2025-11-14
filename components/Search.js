import { Modal, Input, Tag } from 'antd'
import { SearchOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'
import classnames from 'classnames'
import slugify from 'slugify'
import Fuse from 'fuse.js'
import searchStyles from '../styles/search.module.less'
import Shumi from './Shumi'
import UpTag from './UpTag'
import DownTag from './DownTag'
import HodlTag from './HodlTag'

const Search = ({ categories, collapsed }) => {
  const [coins, setCoins] = useState([])
  const [tab, setTab] = useState('search');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState(searchValue);
  const searchInputRef = useRef(null)
  const [fuseCoinIndex, setFuseCoinIndex] = useState(undefined)
  const [modifierKey, setModifierKey] = useState('⌘')
  const [categoryData, setCategoryData] = useState({}) // Stores market cap by category name
  const categoryDataCacheRef = useRef({}) // Cache for category data

  const router = useRouter()

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


  // Fetch category data from AI API (on-demand)
  const fetchCategoryData = useCallback(async (categoryNames) => {
    const CACHE_DURATION = 30000 // 30 seconds
    const now = Date.now()
    const newCategoryData = {}
    const categoriesToFetch = []

    // Check cache first
    for (const name of categoryNames) {
      const cached = categoryDataCacheRef.current[name]
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        newCategoryData[name] = cached.data
      } else {
        categoriesToFetch.push(name)
      }
    }

    // Fetch uncached categories in parallel
    if (categoriesToFetch.length > 0) {
      try {
        const results = await Promise.all(
          categoriesToFetch.map(name =>
            fetch(`https://coinrotator-ai.onrender.com/api/category?categoryName=${encodeURIComponent(name)}`)
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          )
        )

        results.forEach((result, index) => {
          if (result) {
            const categoryName = categoriesToFetch[index]

            const data = {
              trend: result.trend,
              streak: result.streak || 0,
              marketCap: result.marketCap || 0
            }

            newCategoryData[categoryName] = data

            // Update cache
            categoryDataCacheRef.current[categoryName] = {
              data,
              timestamp: now
            }
          }
        })
      } catch (error) {
        console.error('Error fetching category data:', error)
      }
    }

    setCategoryData(prevData => ({ ...prevData, ...newCategoryData }))
  }, [])


  // Fetch category data when filtered categories change
  useEffect(() => {
    let filteredCategories
    if (query?.length === 2) {
      filteredCategories = categories.filter(category => category.toLowerCase().startsWith(query.toLowerCase()))
    } else if (query?.length > 2) {
      filteredCategories = new Fuse(
        categories,
        {
          minMatchCharLength: 3,
          threshold: 0.1,
          ignoreLocation: true
        }
      ).search(query).map((result) => result.item)
    }

    if (filteredCategories && filteredCategories.length > 0) {
      // Limit to top 5 for performance
      const topCategories = filteredCategories.slice(0, 5)

      // Debounce the fetch
      const timeoutId = setTimeout(() => {
        fetchCategoryData(topCategories)
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [query, categories, fetchCategoryData])

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
  // Sort by market cap rank (lower rank = higher market cap)
  if (filteredCoins.length > 0) {
    filteredCoins.sort((a, b) => {
      const rankA = a.marketCapRank || Infinity
      const rankB = b.marketCapRank || Infinity
      return rankA - rankB
    })
  }
  if (filteredCoins.length > 0) {
    coinOptions = (
      <>
        <div className={searchStyles.optionTitle}>Coins</div>
        {
          filteredCoins.slice(0, 5).map((coin) => {
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
                  {coin.dailySuperSuperTrend && (
                    <>
                      {coin.dailySuperSuperTrend === 'UP' && (
                        <UpTag className={searchStyles.trendTag} />
                      )}
                      {coin.dailySuperSuperTrend === 'DOWN' && (
                        <DownTag className={searchStyles.trendTag} />
                      )}
                      {coin.dailySuperSuperTrend === 'HODL' && (
                        <HodlTag className={searchStyles.trendTag} />
                      )}
                      {coin.dailySuperSuperTrendStreak > 1 && (
                        <span className={searchStyles.streakBadge}>{coin.dailySuperSuperTrendStreak}</span>
                      )}
                    </>
                  )}
                  {coin.marketCap && (
                    <span className={searchStyles.marketCap}>
                      ${numberFormatter.format(coin.marketCap)}
                    </span>
                  )}
                  {coin.marketCapRank && (
                    <Tag className={searchStyles.rankBadge}>#{coin.marketCapRank}</Tag>
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
  // Sort by market cap (descending - higher market cap first)
  if (filteredCategories.length > 0) {
    filteredCategories.sort((a, b) => {
      const marketCapA = categoryData[a]?.marketCap || 0
      const marketCapB = categoryData[b]?.marketCap || 0
      return marketCapB - marketCapA
    })
  }
  if (filteredCategories.length > 0) {
    categoryOptions = (
      <>
        <div className={searchStyles.optionTitle}>Categories</div>
        {
          filteredCategories.slice(0, 5).map((category) => {
            // Get fetched data for this category
            const data = categoryData[category]

            // Calculate trend indicator using designed components
            const trendType = data?.trend
            const streak = data?.streak || 0

            let trendIndicator = null
            if (trendType === 'UP') {
              trendIndicator = <UpTag className={searchStyles.trendTag} />
            } else if (trendType === 'DOWN') {
              trendIndicator = <DownTag className={searchStyles.trendTag} />
            } else if (trendType === 'HODL') {
              trendIndicator = <HodlTag className={searchStyles.trendTag} />
            }

            // Add streak number if > 1
            const streakBadge = streak > 1 ? (
              <span className={searchStyles.streakBadge}>{streak}</span>
            ) : null

            return (
              <div
                className={classnames(searchStyles.option, searchStyles.categoryOption)}
                key={category}
                onClick={() => {
                  closeModal();
                  const categorySlug = slugify(category)
                  router.push(`/category/${categorySlug}`)}
                }>
                <span className={searchStyles.categoryName}>{category}</span>
                {(trendIndicator || streakBadge || data?.marketCap) && (
                  <div className={searchStyles.categoryMetadata}>
                    {trendIndicator}
                    {streakBadge}
                    {data?.marketCap > 0 && (
                      <span className={searchStyles.categoryMarketCap}>
                        ${numberFormatter.format(data.marketCap)}
                      </span>
                    )}
                  </div>
                )}
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