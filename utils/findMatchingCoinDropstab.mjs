import { withScope, captureMessage } from '@sentry/node';
import levenshtein from 'js-levenshtein';
import minBy from 'lodash/minBy.js';

import prisma from '../lib/prisma.mjs'
import isDropstabDiscrepancy from './isDropstabDiscrepancy.mjs';

const findMatchingCoinDropstab = async (symbol, name) => {
  symbol = symbol.toLowerCase();
  name = name.toLowerCase();

  // Check if this symbol an anomaly. In that case, we need to find the matching coin by CSV
  const coingeckoSymbol = await isDropstabDiscrepancy(symbol.toUpperCase());

  let matchingCoin;
  if (coingeckoSymbol) {
    matchingCoin = await prisma.coin.findFirst({
      where: {
        symbol: coingeckoSymbol.toLowerCase(),
      },
      select: {
        id: true,
        symbol: true,
        name: true
      }
    });
  } else {
    const matchingCoinsBySymbol = await prisma.coin.findMany({
      where: { symbol },
      select: {
        id: true,
        symbol: true,
        name: true,
        marketCap: true,
      }
    });
    // Symbols can be used by multiple coins, so we need to find the coin heuristically in some cases
    if (matchingCoinsBySymbol.length > 1) {
      const closestCoin = minBy(matchingCoinsBySymbol, (coin) => levenshtein(coin.name, name));

      withScope(scope => {
        scope.setLevel('warning');
        scope.setExtra('symbol', symbol);
        scope.setExtra('closestCoinName', closestCoin.name);
        captureMessage('Detected the right coin via levenshtein distance');
      });
      matchingCoin = closestCoin;
    } else {
      matchingCoin = matchingCoinsBySymbol[0];
    }
  }

  return matchingCoin;
}

export default findMatchingCoinDropstab;