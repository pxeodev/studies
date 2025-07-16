import { useMemo, useState, useReducer, useEffect, useCallback } from 'react'
import isFinite from 'lodash/isFinite'
import isNil from 'lodash/isNil'
import pickBy from 'lodash/pickBy'
import isEqual from 'lodash/isEqual'
import { useRouter } from 'next/router'
import debounce from 'lodash/debounce'

import { signals, SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs'

const useTableFilters = (coinsData) => {
  const router = useRouter()
  const defaultFormState = useMemo(() =>
  ({
      category: 'all',
      portfolio: '',
      trendType: signals.all,
      exchanges: [],
      derivatives: [],
      showCirculatingSupplyPercentage: false,
      show24VolumeByMarketCap: false,
      showPercentageFromATH: false,
      showPercentageFromATL: false,
      showMarketCapRank: false,
      showOpenInterest: false,
      showFundingRate: false,
      showVolume24h: false,
      showFuturesVolume: false,
      showOpenInterestByMarketCap: false,
      showATH: false,
      showATL: false,
      cexdex: ['cex', 'dex'],
      marketCapMin: 0,
      marketCapMax: Number.POSITIVE_INFINITY,
      trendLengthMin: '',
      trendLengthMax: '',
      superTrendFlavor: SUPERTREND_FLAVOR.coinrotator
    })
  , [coinsData])
  const [portfolioInputValue, setPortfolioInputValue] = useState(defaultFormState.portfolio)
  const [formState, formDispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'SET_FROM_ROUTE_PARAMS':
        const routeParams = pickBy(action.payload, (value) => !isNil(value))
        return {
          ...state,
          ...routeParams
        }
      case 'SET_CATEGORY':
        if (isNil(action.payload)) { return state }
        return {
          ...state,
          category: action.payload
        }
      case 'SET_PORTFOLIO':
        if (isNil(action.payload)) { return state }
        return {
          ...state,
          portfolio: action.payload
        }
      case 'SET_TREND_TYPE':
        if (isNil(action.payload)) { return state }
        return {
          ...state,
          trendType: action.payload
        }
      case 'SET_EXCHANGES':
        return {
          ...state,
          exchanges: action.payload
        }
      case 'SET_DERIVATIVES':
        return {
          ...state,
          derivatives: action.payload
        }
      case 'SET_SHOW_CIRCULATING_SUPPLY_PERCENTAGE':
        return {
          ...state,
          showCirculatingSupplyPercentage: action.payload
        }
      case 'SET_SHOW_24H_VOLUME_BY_MARKET_CAP':
        return {
          ...state,
          show24hVolumeByMarketCap: action.payload
        }
      case 'SET_SHOW_PERCENTAGE_FROM_ATH':
        return {
          ...state,
          showPercentageFromATH: action.payload
        }
      case 'SET_SHOW_PERCENTAGE_FROM_ATL':
        return {
          ...state,
          showPercentageFromATL: action.payload
        }
      case 'SET_SHOW_MARKET_CAP_RANK':
        return {
          ...state,
          showMarketCapRank: action.payload
        }
      case 'SET_SHOW_OPEN_INTEREST':
        return {
          ...state,
          showOpenInterest: action.payload
        }
      case 'SET_SHOW_FUNDING_RATE':
        return {
          ...state,
          showFundingRate: action.payload
        }
      case 'SET_SHOW_VOLUME_24H':
        return {
          ...state,
          showVolume24h: action.payload
        }
      case 'SET_SHOW_FUTURES_VOLUME':
        return {
          ...state,
          showFuturesVolume: action.payload
        }
      case 'SET_SHOW_OPEN_INTEREST_BY_MARKET_CAP':
        return {
          ...state,
          showOpenInterestByMarketCap: action.payload
        }
      case 'SET_SHOW_ATH':
        return {
          ...state,
          showATH: action.payload
        }
      case 'SET_SHOW_ATL':
        return {
          ...state,
          showATL: action.payload
        }
      case 'SET_CEX_DEX':
        return {
          ...state,
          cexdex: action.payload
        }
      case 'SET_SUPERTREND_FLAVOR':
        return {
          ...state,
          superTrendFlavor: action.payload
        }
      case 'SET_MARKET_CAP_MIN':
        let newMarketCapMin
        if (action.payload === '') {
          newMarketCapMin = defaultFormState.marketCapMin
        } else {
          newMarketCapMin = parseInt(action.payload)
          if (!isFinite(newMarketCapMin)) {
            return state;
          }
        }

        return {
          ...state,
          marketCapMin: newMarketCapMin
        }
      case 'SET_MARKET_CAP_MAX':
        let newMarketCapMax
        if (action.payload === '') {
          newMarketCapMax = defaultFormState.marketCapMax
        } else {
          newMarketCapMax = parseInt(action.payload)
          if (!isFinite(newMarketCapMax)) {
            return state;
          }
        }

        return {
          ...state,
          marketCapMax: newMarketCapMax
        }
      case 'SET_TREND_LENGTH_MIN':
        let trendLengthMin
        if (action.payload === '') {
          trendLengthMin = defaultFormState.trendLengthMin
        } else {
          trendLengthMin = parseInt(action.payload)
          if (!isFinite(trendLengthMin)) {
            return state;
          }
        }

        return {
          ...state,
          trendLengthMin: trendLengthMin
        }
      case 'SET_TREND_LENGTH_MAX':
        let trendLengthMax
        if (action.payload === '') {
          trendLengthMax = defaultFormState.trendLengthMax
        } else {
          trendLengthMax = parseInt(action.payload)
          if (!isFinite(trendLengthMax)) {
            return state;
          }
        }

        return {
          ...state,
          trendLengthMax: trendLengthMax
        }
      case 'RESET':
        return defaultFormState;
      default:
        return state;
    }
  }, defaultFormState)

  useEffect(() => {
    if (router.isReady) {
      const changedParams = pickBy(formState, (value, key) => {
        if (key === 'exchanges' || key === 'derivatives') {
          const oldArray = Array.isArray(router.query[key]) ? router.query[key] : [router.query[key]]
          return !isEqual(value, oldArray)
        } else {
          return value !== router.query[key]
        }
      })
      const changedParamsThatAreDefault = Object.keys(changedParams).filter((key) => {
        return isEqual(changedParams[key], defaultFormState[key])
      })
      if (Object.keys(changedParams).length > 0) {
        let query = {
          ...router.query,
          ...changedParams
        }
        changedParamsThatAreDefault.forEach(defaultParam => {
          delete query[defaultParam]
        })
        if (!isEqual(query, router.query)) {
          router.push({
            pathname: router.pathname,
            query
          }, null, { shallow: true })
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState, defaultFormState])
  useEffect(() => {
    if (!router.isReady) { return; }

    setPortfolioInputValue(router.query.portfolio)
    let exchanges, derivatives
    if (router.query.exchanges) {
      exchanges = Array.isArray(router.query.exchanges) ? router.query.exchanges : [router.query.exchanges]
    }
    if (router.query.derivatives) {
      derivatives = Array.isArray(router.query.derivatives) ? router.query.derivatives : [router.query.derivatives]
    }
    formDispatch({
      type: 'SET_FROM_ROUTE_PARAMS',
      payload: {
        category: router.query.category,
        portfolio: router.query.portfolio,
        trendType: router.query.trendType,
        exchanges,
        derivatives,
        marketCapMin: router.query.marketCapMin,
        marketCapMax: router.query.marketCapMax,
        trendLengthMin: router.query.trendLengthMin,
        trendLengthMax: router.query.trendLengthMax,
        superTrendFlavor: router.query.superTrendFlavor,
        showCirculatingSupplyPercentage: router.query.showCirculatingSupplyPercentage,
        show24hVolumeByMarketCap: router.query.show24hVolumeByMarketCap,
        showPercentageFromATH: router.query.showPercentageFromATH,
        showPercentageFromATL: router.query.showPercentageFromATL,
        showMarketCapRank: router.query.showMarketCapRank,
        showOpenInterest: router.query.showOpenInterest,
        showFundingRate: router.query.showFundingRate,
        showVolume24h: router.query.showVolume24h,
        showFuturesVolume: router.query.showFuturesVolume,
        showOpenInterestByMarketCap: router.query.showOpenInterestByMarketCap,
        showATH: router.query.showATH,
        showATL: router.query.showATL,
      }
    })
  }, [router.isReady, router.query])
  useEffect(() => {
    const handleRouteChange = (_url, { shallow }) => {
      if (!shallow) {
        setTimeout(() => formDispatch({ type: 'RESET' }), 500)
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setPortfolioDebounced = useCallback(debounce((portfolio) => {
    formDispatch({ type: 'SET_PORTFOLIO', payload: portfolio })
  }, 400), [])
  useEffect(() => setPortfolioDebounced(portfolioInputValue), [portfolioInputValue, setPortfolioDebounced])

  return [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue]
}

export default useTableFilters;