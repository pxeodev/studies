import { Select } from 'antd'
import { SearchOutlined, CloseOutlined } from "@ant-design/icons";
import { useState } from 'react';
import { useRouter } from 'next/router'
import classnames from 'classnames'

import searchStyles from '../styles/search.module.less'

const { Option, OptGroup } = Select;

const Search = ({ categories, coins }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter()

  const coinOptions = (
    <OptGroup label="Coins">
      {coins.map((coin) => {
        return (
          <Option value={coin.id} key={coin.id} className={classnames(searchStyles.coinOption, searchStyles.option)}>
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
            className={classnames(searchStyles.categoryOption, searchStyles.option)}
          >{category}</Option>
        )
      })}
    </OptGroup>
  )

  return (
    <Select
      showSearch
      placeholder="Search"
      className={searchStyles.search}
      suffixIcon={isOpen ? <CloseOutlined /> : <SearchOutlined />}
      onDropdownVisibleChange={() => setIsOpen(!isOpen)}
      onSelect={coinId => router.push(`/coin/${coinId}`)}
    >
      {coinOptions}
      {categoryOptions}
    </Select>
  );
}

export default Search