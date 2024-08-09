import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { XOutlined, GlobalOutlined } from '@ant-design/icons';
import { useContext, useEffect, useState, useMemo, useCallback, memo } from 'react';
import { Card, Space, Table, Tag, Typography } from 'antd';
import Link from 'next/link'
import classnames from 'classnames';
import round from 'lodash/round';
import { useHydrated } from "react-hydration-provider";
import slugify from 'slugify'

import PlatformSelect from './PlatformSelect';
import coinStyles from '../styles/coin.module.less'
import variableStyles from '../styles/variables.module.less'
import { DarkModeContext } from '../layouts/screener.js';
import { cleanupCoinLink } from "../utils/cleanupLinks";
import { getImageURL } from "../utils/minifyImageURL.js";
import useKeyPass from "../hooks/useKeyPass.js";

const { Title } = Typography;

const Chart = memo(function ChartFunc({ symbol, hideToolbar, darkMode }) {
  return (
    <AdvancedRealTimeChart
      autosize
      interval="D"
      symbol={symbol}
      hide_side_toolbar={hideToolbar}
      container_id={coinStyles.chart}
      theme={darkMode ? "dark" : "light"}
      calendar
      details
    />
  )
})

const PriceDataTab = ({ coin, screens, liveCoinData, price }) => {
  let percentageFromATH, percentageFromATL
  if (price) {
    percentageFromATH = round(((coin.ath - price) / coin.ath) * 100, 2)
    percentageFromATL = round((price / coin.atl) * 100, 2)
  }
  const [darkMode] = useContext(DarkModeContext);
  const hydrated = useHydrated();
  const [showChart, setShowChart] = useState(false)
  useEffect(() => {
    setShowChart(true)
  }, [])
  const hasKeyPass = useKeyPass()
  const notation = screens.sm ? 'standard' : 'compact'
  let circulatingSupplyPercentage
  if (coin.circulatingSupply && coin.totalSupply) {
    circulatingSupplyPercentage = round(coin.circulatingSupply / coin.totalSupply * 100, 2)
  }
  let openInterest, openInterestChangePercent1h, fundingRate, futuresVolume24h, openInterestByFuturesVolume24h
  if (hasKeyPass && liveCoinData) {
    const matchingCoin = liveCoinData.find((liveCoin) => liveCoin.id === coin.id)
    if (matchingCoin) {
      openInterest = matchingCoin.openInterest
      openInterestChangePercent1h = round(matchingCoin.openInterestChangePercent1h, 2)
      fundingRate = matchingCoin.fundingRate
      futuresVolume24h = matchingCoin.futuresVolume24h
      openInterestByFuturesVolume24h = matchingCoin.openInterestByfuturesVolume24h
    }
  }
  const url = cleanupCoinLink(coin.homepage, coin.symbol)
  const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium' })
  const currencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation })
  const preciseCurrencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', maximumFractionDigits: 20, notation })
  const numberFormatter = useMemo(() => new Intl.NumberFormat([], { notation, maximumFractionDigits: 3 }), [notation])
  const renderRoi = useCallback((multiple) => {
    if (multiple === null || multiple === 1 ) { return null }

    const roi = round((multiple - 1) * 100, 2);
    const formattedNumber = hydrated ? numberFormatter.format(roi) : roi
    return <span className={roi > 0 ? coinStyles.greenRoi : coinStyles.redRoi}>{formattedNumber}%</span>
  }, [numberFormatter, hydrated])

  return <>
    {coin.platforms.length ? (
      <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionContract)}>
        <PlatformSelect
          imageSlug={coin.imageSlug}
          platforms={coin.platforms}
          symbol={coin.symbol}
          chainsData={coin.chainsData}
        />
      </Card.Grid>
    ) : <></>}
    <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionOnline, coinStyles.sectionFlex, { [coinStyles.sectionOnlineFW]: !coin.platforms.length })}>
      <Space wrap>
        { coin.twitter ? (
          <a href={`https://x.com/${coin.twitter}`} target="_blank" rel="noreferrer">
            <Tag icon={<XOutlined />} color="#55ACEE" className={coinStyles.button}>
            @{coin.twitter}
            </Tag>
          </a>
        ) : <></> }
        { url ? (
          <a href={url} target="_blank" rel="noreferrer">
            <Tag icon={<GlobalOutlined />} color={variableStyles.black} className={classnames(coinStyles.button, coinStyles.buttonSite)}>
              {url.host}
            </Tag>
          </a>
        ) : <></>}
      </Space>
    </Card.Grid>
    <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionDataC1)}>
      { coin.marketCap ? (
        <div className={coinStyles.data}>
          <Title level={3} className={coinStyles.label}>Market Cap</Title>
          <Space wrap>
            <span className={coinStyles.value}>{hydrated ? currencyFormatter.format(coin.marketCap) : coin.marketCap}</span>
            {coin.marketCapRank ? <Tag>#{coin.marketCapRank}</Tag> : <></>}
          </Space>
        </div>
      ) : <></>}
      <div className={coinStyles.data}>
        <Title level={3} className={coinStyles.label}>All-Time High</Title>
        <div className={coinStyles.value}>
          {hydrated ? preciseCurrencyFormatter.format(coin.ath) : coin.ath}
          { percentageFromATH ? (
            <span className={coinStyles.valueAnnotation}>
              &nbsp;({percentageFromATH}%)
            </span>
            ) : <></>
          }
        </div>
      </div>
      <div className={coinStyles.data}>
        <Title level={3} className={coinStyles.label}>All-Time Low</Title>
        <div className={coinStyles.value}>
          {hydrated ? preciseCurrencyFormatter.format(coin.atl) : coin.atl}
          { percentageFromATL ? (
            <span className={coinStyles.valueAnnotation}>
              &nbsp;({percentageFromATL}%)
            </span>
            ) : <></>
          }
        </div>
      </div>
    </Card.Grid>
    { (coin.fullyDilutedValuation || coin.circulatingSupply || coin.totalSupply || coin.maxSupply ) ? (
      <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionDataC2)}>
        { coin.fullyDilutedValuation ? (
          <div className={coinStyles.data}>
            <Title level={3} className={coinStyles.label}>Fully Diluted Valuation</Title>
            <div className={coinStyles.value}>{hydrated ? currencyFormatter.format(coin.fullyDilutedValuation) : coin.fullyDilutedValuation}</div>
          </div>
        ) : <></>}
        { coin.circulatingSupply ? (
          <div className={coinStyles.data}>
            <Title level={3} className={coinStyles.label}>Circulating Supply</Title>
            <div className={coinStyles.value}>
              {hydrated ? numberFormatter.format(coin.circulatingSupply) : coin.circulatingSupply}
              { circulatingSupplyPercentage ? (
                <span className={coinStyles.valueAnnotation}>
                  &nbsp;({circulatingSupplyPercentage}%)
                </span>
                ) : <></>
              }
            </div>
          </div>
        ) : <></>}
        { coin.totalSupply ? (
          <div className={coinStyles.data}>
            <Title level={3} className={coinStyles.label}>Total Supply</Title>
            <div className={coinStyles.value}>{hydrated ? numberFormatter.format(coin.totalSupply) : coin.totalSupply}</div>
          </div>
        ) : <></>}
        { coin.maxSupply && coin.maxSupply !== coin.totalSupply ? (
          <div className={coinStyles.data}>
            <Title level={3} className={coinStyles.label}>Max Supply</Title>
            <div className={coinStyles.value}>{hydrated ? numberFormatter.format(coin.maxSupply) : coin.maxSupply}</div>
          </div>
        ) : <></>}
      </Card.Grid>
    ) : <></>}
    <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionTags)}>
      <Title level={3} className={coinStyles.label}>Categories</Title>
      <div className={coinStyles.data}>
        {
          coin.categories.map((tag) => {
            const categorySlug = slugify(tag);
            return (
              <Link href={`/category/${categorySlug}`} key={tag} prefetch={false}>
                <Tag>{tag}</Tag>
              </Link>
            );
          })
        }
      </div>
      {
        coin.similarCoins.length ? (
          <div className={coinStyles.data}>
            <Title level={3} className={coinStyles.label}>Similar Coins</Title>
            {
              // eslint-disable-next-line @next/next/no-img-element
              coin.similarCoins.map(coin =>
                (
                  (<a href={`/coin/${coin.id}`} key={coin.id}>

                    <Tag
                      className={coinStyles.similarCoin}
                      // eslint-disable-next-line @next/next/no-img-element
                      icon={<img className={coinStyles.similarCoin} width={14} height={14} src={getImageURL(coin.imageSlug, 'thumb')} alt={coin.name} />}
                      key={coin.name}
                    >
                      {coin.name}
                    </Tag>

                  </a>)
                )
              )
            }
          </div>
        ) : <></>
      }
    </Card.Grid>
    { openInterest ? (
      <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionTags)}>
          <div className={coinStyles.data}>
            <Title level={3} className={coinStyles.label}>Open Interest (1h)</Title>
            <span className={coinStyles.value}>{currencyFormatter.format(openInterest)}</span>
            <span className={classnames(coinStyles.percentageChange, {[coinStyles.percentageChangeNegative]: openInterestChangePercent1h < 0})}>
              &nbsp;(
              {openInterestChangePercent1h > 0 ? '+' : ''}
              {openInterestChangePercent1h}%
              )
            </span>
          </div>
          {
            fundingRate ? (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>Funding Rate (1h)</Title>
                <span className={coinStyles.value}>{numberFormatter.format(fundingRate)}</span>
              </div>
            ) : <></>
          }
          {
            futuresVolume24h ? (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>Futures Volume (24h)</Title>
                <span className={coinStyles.value}>
                  {currencyFormatter.format(futuresVolume24h)}
                </span>
              </div>
            ) : <></>
          }
          {
            openInterestByFuturesVolume24h ? (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>OI / 24h Volume</Title>
                <span className={coinStyles.value}>
                  {numberFormatter.format(openInterestByFuturesVolume24h)}
                </span>
              </div>
            ) : <></>
          }
      </Card.Grid>
    ) : <></> }
    {
      (coin.launch_price || coin.launch_date_start || coin.launch_roi_usd) ? (
        <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionIco)}>
          {
            coin.launch_price ? (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>ICO Price</Title>
                <span className={coinStyles.value}>{hydrated ? currencyFormatter.format(coin.launch_price) : coin.launch_price}</span>
              </div>
            ) : <></>
          }
          {
            coin.launch_date_start ? (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>ICO Date</Title>
                {
                  <span className={coinStyles.value}>{dateFormatter.format(coin.launch_date_start)}</span>
                }
              </div>
            ) : (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>Performance since ICO</Title>
              </div>
            )
          }
          {
            coin.launch_roi_usd ? (
              <Table
                className={coinStyles.valueTable}
                bordered
                dataSource={[
                  {
                    key: 'values',
                    usd: coin.launch_roi_usd,
                    eth: coin.launch_roi_eth,
                    btc: coin.launch_roi_btc
                  },
                ]}
                columns={[
                  {
                    title: 'Currency',
                    render: () => 'ROI'
                  },
                  {
                    title: 'USD',
                    dataIndex: 'usd',
                    render: renderRoi
                  },
                  {
                    title: 'BTC',
                    dataIndex: 'btc',
                    render: renderRoi
                  },
                  {
                    title: 'ETH',
                    dataIndex: 'eth',
                    render: renderRoi
                  },
                ]}
                pagination={{ position: ['none', 'none'] }}
              />
            ) : <></>
          }
        </Card.Grid>
      ) : <></>
    }
    <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionChart)} id="chart">
      { showChart ? <Chart symbol={coin.chart} hideToolbar={!screens.sm} darkMode={darkMode} /> : <></> }
    </Card.Grid>
  </>;
}

export default PriceDataTab;