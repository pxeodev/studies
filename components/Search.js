import { Select } from 'antd'
import { SearchOutlined, CloseOutlined } from "@ant-design/icons";
import { useState, useRef } from 'react';
import { useRouter } from 'next/router'
import classnames from 'classnames'

import searchStyles from '../styles/search.module.less'

const { Option, OptGroup } = Select;

const Search = ({ categories, coins }) => {
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
      open
      value={null}
      ref={selectRef}
      placeholder="Search"
      className={searchStyles.search}
      suffixIcon={isOpen ? <CloseOutlined /> : <SearchOutlined />}
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