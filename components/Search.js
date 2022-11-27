import { Select } from 'antd'
import { SearchOutlined } from "@ant-design/icons";
import { useState, useRef } from 'react';
import { useRouter } from 'next/router'
import classnames from 'classnames'

import searchStyles from '../styles/search.module.less'

const { Option, OptGroup } = Select;

const Search = ({ categories, coins, collapsed }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter()
  const selectRef = useRef(null)

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
    <Select
      showSearch
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
      placeholder={<>
        <SearchOutlined className={searchStyles.placeholderMagnifier} />
        {collapsed ? '' : <span className={searchStyles.placeholderText}>Search</span>}
      </>}
      className={classnames(searchStyles.search, {[searchStyles.collapsed]: collapsed})}
      suffixIcon={null}
      onDropdownVisibleChange={() => setIsOpen(!isOpen)}
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
  );
}

export default Search