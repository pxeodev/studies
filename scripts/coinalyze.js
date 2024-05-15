import dotenv from 'dotenv';
import axios from 'axios'
import startofHour from 'date-fns/startOfHour/index.js';

import prisma from '../lib/prisma.mjs';

import { getSupportedExchanges, getSupportedFutureMarkets, getOpenInterest, getFundingRate, getVolume24h } from '../lib/coinalyze.mjs';

dotenv.config();

const preferredMarkets = ['A', '6', 'Y', 'F'];

const fetchCoinalyze = async () => {
  const now = startofHour(new Date());
  const databaseExchanges = await prisma.exchange.findMany({ select: { id: true, name: true } })
  const databaseExchangeNames = databaseExchanges.map(exchange => exchange.name);
  let supportedExchanges = await getSupportedExchanges()
  supportedExchanges = supportedExchanges.data.filter(exchange => databaseExchangeNames.includes(exchange.name));
  const supportedExchangeCodes = supportedExchanges.map(exchange => exchange.code);

  let supportedFutureMarkets = await getSupportedFutureMarkets();
  supportedFutureMarkets = supportedFutureMarkets.data.filter(market => market.is_perpetual && supportedExchangeCodes.includes(market.exchange));
  const supportedFutureSymbols = supportedFutureMarkets.map(market => market.base_asset.toLowerCase());

  const databaseCoins = await prisma.coin.findMany({
    select: {
      symbol: true,
      id: true,
    },
    where: {
      symbol: {
        in: supportedFutureSymbols
      }
    }
  });
  for (const coin of databaseCoins) {
    const supportedMarketsForCoin = supportedFutureMarkets.filter(market => market.base_asset.toLowerCase() === coin.symbol);
    let market = supportedMarketsForCoin.filter(market => preferredMarkets.includes(market.exchange))
                                        .sort((a, b) => preferredMarkets.indexOf(a.exchange) - preferredMarkets.indexOf(b.exchange))[0];
    if (!market) {
      market = supportedMarketsForCoin[0];
    }
    const marketExchange = supportedExchanges.find(exchange => exchange.code === market.exchange);
    const databaseExchange = databaseExchanges.find(exchange => exchange.name === marketExchange.name);
    const openInterest = (await getOpenInterest(market.symbol)).data[0].value;
    const fundingRate = (await getFundingRate(market.symbol)).data[0].value;
    const futuresVolume24h = await getVolume24h(market.symbol);
    await prisma.coin.update({
      where: {
        id: coin.id
      },
      data: {
        openInterest,
        fundingRate,
        futuresExchangeId: databaseExchange.id,
        futuresVolume24h,
      }
    });
    await prisma.coinTime.create({
      data: {
        coinId: coin.id,
        date: now,
        time: now,
        timeframe: '1h',
        openInterest,
        fundingRate,
        futuresVolume24h,
      }
    })
  }
}

setTimeout(async () => {
  await fetchCoinalyze()
  if (process.env.NODE_ENV === 'production') {
    await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/new-coinalyze-data`)
  }
}, 99);