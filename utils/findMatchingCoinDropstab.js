import * as Sentry from '@sentry/node';
import levenshtein from 'js-levenshtein';
import minBy from 'lodash/minBy';

import prisma from '../lib/prisma'

const findMatchingCoinDropstab = async (symbol, name) => {
  symbol = symbol.toLowerCase();
  name = name.toLowerCase();

  // TODO: Check if this symbol an anomaly. In that case, we need to find the matching coin by CSV
  const isSymbolAnomaly = false;

  let matchingCoin;
  if (isSymbolAnomaly) {
    matchingCoin = await prisma.coin.findOne({
      where: {
        symbol: isSymbolAnomaly,
      },
      select: {
        id: true,
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

      Sentry.withScope(scope => {
        scope.setLevel('warning');
        scope.setExtra('symbol', symbol);
        Sentry.captureMessage(`Detected the right coin via levenshtein distance: ${closestCoin.name} (${symbol})`);
      });
      matchingCoin = closestCoin;
    } else {
      matchingCoin = matchingCoinsBySymbol[0];
    }
  }

  return matchingCoin;
}

export default findMatchingCoinDropstab;