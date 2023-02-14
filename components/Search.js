import { Select, Modal, Input } from 'antd'
import { SearchOutlined } from "@ant-design/icons";
import { useState, useRef } from 'react';
import { useRouter } from 'next/router'
import classnames from 'classnames'

import searchStyles from '../styles/search.module.less'

const { Option, OptGroup } = Select;

const Search = ({ categories, coins, collapsed }) => {
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const router = useRouter()
  const selectRef = useRef(null)
  const searchRef = useRef(null)

  let searchTrigger = <div onClick={() => setSearchModalVisible(true)}>
    <Input
      className={searchStyles.searchBar}
      prefix={<>
        <SearchOutlined className={searchStyles.placeholderMagnifier} />
        <span className={searchStyles.placeholderText}>Search</span>
      </>}
    />
  </div>
  if (collapsed) {
    searchTrigger = <div onClick={() => setSearchModalVisible(true)} className={searchStyles.searchIcon} >
      <SearchOutlined className={searchStyles.placeholderMagnifier} />
    </div>
  }
  const coinOptions = (
    <OptGroup label="Coins">
      {coins.map((coin) => {
        return (
          <Option
            value={coin.id}
            key={coin.id}
            className={classnames(searchStyles.coinOption, searchStyles.option)}
            data-type="coin"
            data-symbol={coin.symbol}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coin.image} alt={coin.name}/>
            <span className={searchStyles.coinName}>{coin.name}</span>
            <span className={searchStyles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
          </Option>
        )
      })}
    </OptGroup>
  )
  const categoryOptions = (
    <OptGroup label="Categories">
      {categories.map((category) => {
        return (
          <Option
            value={category}
            key={category}
            data-type="category"
            className={classnames(searchStyles.categoryOption, searchStyles.option)}
          >{category}</Option>
        )
      })}
    </OptGroup>
  )

  return (
    <div ref={searchRef}>
      {searchTrigger}
      <Modal
        open={searchModalVisible}
        onCancel={() => setSearchModalVisible(false)}
        className={searchStyles.modal}
        footer={null}
        closeIcon={null}
      >
        <Select
          allowClear
          getPopupContainer={() => searchRef.current}
          showSearch
          className={searchStyles.searchSelect}
          popupClassName={searchStyles.searchResults}
          filterOption={(input, option) => {
            const matchesValue = option?.value?.toLowerCase()?.includes(input.toLowerCase());
            if (option['data-type'] === 'coin') {
              return matchesValue || option['data-symbol'].toLowerCase().includes(input.toLowerCase());
            } else {
              return matchesValue
            }
          }}
          value={null}
          ref={selectRef}
          onSelect={(value, target) => {
            if (target['data-type'] === 'coin') {
              router.push(`/coin/${value}`);
            } else {
              router.push(`/?category=${value}`);
            }
            setTimeout(() => selectRef.current?.blur(), 0);
          }}
        >
          {coinOptions}
          {categoryOptions}
        </Select>
      </Modal>
    </div>
  );
}

export default Search