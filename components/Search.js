import { Modal, Input } from 'antd'
import { SearchOutlined } from "@ant-design/icons";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'
import classnames from 'classnames'
import slugify from 'slugify'

import searchStyles from '../styles/search.module.less'

const Search = ({ categories, coins, collapsed }) => {
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState(searchValue);
  const searchInputRef = useRef(null)
  useEffect(() => {
    const eventRef = document.addEventListener('keydown', (e) => {
      if (e.key === '/') {
        setSearchModalVisible(true)
      }
    })
    return () => {
      document.removeEventListener('keydown', eventRef)
    }
  })
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
  const onSearchValueChange = useCallback((e) => {
    setSearchValue(e.target.value);
    setQueryDebounced(e.target.value.trim().toLowerCase());
  }, [setSearchValue, setQueryDebounced]);
  const closeModal = useCallback(() => {
    setSearchModalVisible(false)
    setSearchValue('')
    setQuery('')
  }, []);
  const router = useRouter()

  let searchTrigger = <div onClick={() => setSearchModalVisible(true)}>
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
    searchTrigger = <div onClick={() => setSearchModalVisible(true)} className={searchStyles.searchIcon} >
      <SearchOutlined className={searchStyles.placeholderMagnifier} />
    </div>
  }
  let coinOptions = null
  const filteredCoins = coins.filter((coin) => {
    return coin.name.toLowerCase().includes(query) || coin.symbol.toLowerCase().includes(query)
  })
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
  const filteredCategories = categories.filter((category) => {
    return category.toLowerCase().includes(query)
  })
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
                  const categorySlug = slugify(category, { lower: true })
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
      Try&nbsp;
      <span className={searchStyles.noQueryHighlight}>Ethereum, Bitcoin, DeFi, AI</span>
    </div>
  } else if (filteredCoins.length === 0 && filteredCategories.length === 0) {
    results = <div className={searchStyles.empty}>
      No results.
    </div>
  }

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
        <Input
          className={searchStyles.searchSelect}
          allowClear
          prefix={<SearchOutlined className={searchStyles.placeholderMagnifier}/>}
          value={searchValue}
          onChange={onSearchValueChange}
          ref={searchInputRef}
        />
        <div className={searchStyles.searchResults}>
          {results}
        </div>
      </Modal>
    </div>
  );
}

export default Search