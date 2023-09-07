import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { TwitterOutlined, GlobalOutlined } from '@ant-design/icons';
import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
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

const { Title } = Typography;

const PriceDataTab = ({ coin, screens }) => {
  const [darkMode] = useContext(DarkModeContext);
  const hydrated = useHydrated();
  const [showChart, setShowChart] = useState(false)
  useEffect(() => {
    setShowChart(true)
  }, [])
  const notation = screens.sm ? 'standard' : 'compact'
  let circulatingSupplyPercentage
  if (coin.circulatingSupply && coin.totalSupply) {
    circulatingSupplyPercentage = round(coin.circulatingSupply / coin.totalSupply * 100, 2)
  }
  let url
  try {
    url = new URL(coin.homepage).host
  } catch(e) {}
  const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium' })
  const currencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation })
  const preciseCurrencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', maximumFractionDigits: 20, notation })
  const numberFormatter = useMemo(() => new Intl.NumberFormat([], { notation }), [notation])
  const compactNumberFormatter = new Intl.NumberFormat([], { notation: 'compact' })
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
          images={coin.images}
          platforms={coin.platforms}
          symbol={coin.symbol}
          chainsData={coin.chainsData}
        />
      </Card.Grid>
    ) : <></>}
    <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionOnline, coinStyles.sectionFlex, { [coinStyles.sectionOnlineFW]: !coin.platforms.length })}>
      <Space wrap>
        { coin.twitter ? (
          <a href={`https://twitter.com/${coin.twitter}`} target="_blank" rel="noreferrer">
            <Tag icon={<TwitterOutlined />} color="#55ACEE" className={coinStyles.button}>
            @{coin.twitter}&nbsp;({hydrated ? compactNumberFormatter.format(coin.twitterFollowers) : coin.twitterFollowers})
            </Tag>
          </a>
        ) : <></> }
        { url ? (
          <a href={coin.homepage} target="_blank" rel="noreferrer">
            <Tag icon={<GlobalOutlined />} color={variableStyles.black} className={classnames(coinStyles.button, coinStyles.buttonSite)}>
              {url}
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
        <div className={coinStyles.value}>{hydrated ? preciseCurrencyFormatter.format(coin.ath) : coin.ath}</div>
      </div>
      <div className={coinStyles.data}>
        <Title level={3} className={coinStyles.label}>All-Time Low</Title>
        <div className={coinStyles.value}>{hydrated ? preciseCurrencyFormatter.format(coin.atl) : coin.atl}</div>
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
              { circulatingSupplyPercentage ? ` / ${circulatingSupplyPercentage}%` : <></>}
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
      <Title level={3} className={coinStyles.label}>Tags</Title>
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
    </Card.Grid>
    {
      coin.similarCoins.length ? (
        <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionSimilarCoins)}>
          <Title level={3} className={coinStyles.label}>Similar Coins</Title>
          {
            // eslint-disable-next-line @next/next/no-img-element
            coin.similarCoins.map(coin =>
              (
                (<Link href={`/coin/${coin.id}`} key={coin.id}>

                  <Tag
                    className={coinStyles.similarCoin}
                    // eslint-disable-next-line @next/next/no-img-element
                    icon={<img className={coinStyles.similarCoin} width={14} height={14} src={coin.images.thumb} alt={coin.name} />}
                    key={coin.name}
                  >
                    {coin.name}
                  </Tag>

                </Link>)
              )
            )
          }
        </Card.Grid>
      ) : <></>
    }
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
                  coin.launch_date_start?.getTime() == coin.launch_date_end?.getTime() ? (
                    <span className={coinStyles.value}>{hydrated ? dateFormatter.format(coin.launch_date_start) : dateFormatter.format(coin.launch_date_start)}</span>
                  ) : (
                    <>
                      <span className={coinStyles.value}>{hydrated ? dateFormatter.format(coin.launch_date_start) : dateFormatter.format(coin.launch_date_start)}</span>
                      {` - `}
                      <span className={coinStyles.value}>{hydrated ? dateFormatter.format(coin.launch_date_end) : dateFormatter.format(coin.launch_date_end)}</span>
                    </>
                  )
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
      { showChart ?
        <AdvancedRealTimeChart
          autosize
          interval="D"
          symbol={`${coin.symbol.toUpperCase()}USDT`}
          hide_side_toolbar={!screens.sm}
          container_id={coinStyles.chart}
          theme={darkMode ? "dark" : "light"}
          studies={["STD;Supertrend"]}
          calendar
          details
        /> :
        <></>
      }
    </Card.Grid>
  </>;
}

export default PriceDataTab;