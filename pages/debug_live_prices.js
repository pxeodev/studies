import { Table, Layout } from 'antd'
import Link from 'next/link'
import { Client, useHydrated } from 'react-hydration-provider'
import classnames from 'classnames'
import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'

import globalData from '../lib/globalData'
import prisma from '../lib/prisma.mjs'
import PageHeader from '../components/PageHeader'
import TableFilters from '../components/TableFilters'
import useVirtualTable from '../hooks/useVirtualTable'
import useTableFilters from '../hooks/useTableFilters'
import useSocketStore from '../hooks/useSocketStore';

import tableStyles from '../styles/table.module.less'
import watchlistStyles from '../styles/watchlist.module.less'
import convertTickersToExchanges from '../utils/convertTickersToExchanges'

export async function getStaticProps() {
  const appData = await globalData()
  let coins = await prisma.coin.findMany({
    select: {
      id: true,
      name: true,
      symbol: true,
      images: true,
      tickers: true,
    },
    orderBy: {
      marketCapRank: 'asc',
    }
  })
  coins = coins.map((coin) => {
    return {
      ...coin,
      exchanges: convertTickersToExchanges(coin.tickers),
    }
  })
  return {
    props: {
      coins,
      appData,
    }
  }
}

export default function LivePriceDebugger({ coins, appData }) {
  const hydrated = useHydrated()
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coins)

  const socket = useSocketStore(state => state.socket)
  const [prices, setPrices] = useState({})

  const currencyFormatter = useMemo(() => new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 9 }), [])
  useEffect(() => {
    if (socket) {
      socket.on("debug_i", (prices) => {
        const now = Date.now()
        Object.entries(prices).forEach(([coinSymbol, price]) => {
          prices[coinSymbol] = {
            ...price,
            lastUpdated: now,
          }
        })
        setPrices(prices)
        console.debug("Received initial prices", prices);
      });

      socket.on('debug_p', (priceUpdates) => {
        setPrices((prevPrices) => {
          const newPrices = { ...prevPrices }
          Object.entries(priceUpdates).forEach(([coinSymbol, price]) => {
            newPrices[coinSymbol] = {
              ...price,
              lastUpdated: Date.now(),
            }
          })
          return newPrices
        })
      })
    }
  }, [socket, currencyFormatter])

  let coinsData = coins.filter((coin) => {
    const coinSymbolLower = coin.symbol.toLowerCase()
    const coinNameLower = coin.name.toLowerCase()
    const portfolioFilter = formState.portfolio
      .replace(/\s/g, '')
      .split(',')
      .map((coinName) => coinName.toLowerCase())
      .filter((coinName) => coinName.length)
    return formState.portfolio === '' || portfolioFilter.some((coinName) => coinNameLower.includes(coinName) || coinSymbolLower.includes(coinName))
  })
  coinsData = coinsData.map((coin) => {
    return {
      ...coin,
      key: coin.id,
      price: prices[coin.symbol]?.price,
      exchange: prices[coin.symbol]?.exchange,
      lastUpdated: prices[coin.symbol]?.lastUpdated,
    }
  })
  const dateFormatter = new Intl.DateTimeFormat([], {  })

  const columns = [
    {
      title: 'Coin',
      width: 200,
      dataIndex: 'name',
      fixed: hydrated ? 'left' : null,
      sorter: (a, b) => a.coins.name.localeCompare(b.coins.name),
      render: (name, coin) => {
        return (
          (<Link href={`/coin/${coin.id}`} className={tableStyles.coin} passHref>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coin.images.small} alt={name} className={tableStyles.image} loading="lazy"/>
            <span className={tableStyles.name}>{name}</span>
            <span className={tableStyles.symbol}>{coin.symbol}</span>
          </Link>)
        );
      }
    },
    {
      width: 125,
      title: 'Live Price',
      dataIndex: 'price',
      render: (price) => price ? currencyFormatter.format(price) : null
    },
    {
      width: 125,
      title: 'Exchange',
      dataIndex: 'exchange',
    },
    {
      width: 125,
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      render: (timestamp) => {
        return timestamp ? `${formatDistanceToNowStrict(new Date(timestamp))} ago` : null
      }
    }
  ]

  return (
    <>
      <PageHeader title="Live Price Debugger"/>
      <Layout.Content className={watchlistStyles.container}>
        <TableFilters
          coinsData={coins}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          setPortfolioInputValue={setPortfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
        />
        <Client>
          <Table
            columns={columns}
            dataSource={coinsData}
            pagination={false}
            portfolio={formState.portfolio}
            className={classnames(tableStyles.table, watchlistStyles.table)}
            rowClassName={tableStyles.row}
            {...useVirtualTable()}
          />
        </Client>
      </Layout.Content>
    </>
  );
}
