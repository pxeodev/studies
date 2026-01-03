/**
 * API endpoint to fetch historical oscillator data
 * Returns time series of z-score oscillator values
 */
import sql from '../../../lib/database.mjs';

const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coinId, trendType, window, days: daysParam } = req.query;

  // Validate required parameters
  if (!trendType) {
    return res.status(400).json({ error: 'trendType required (UP, DOWN, HODL, or ALL)' });
  }

  if (!window) {
    return res.status(400).json({ error: 'window required (7, 30, or 90)' });
  }

  // Validate window
  const windowInt = parseInt(window, 10);
  if (isNaN(windowInt) || ![7, 30, 90].includes(windowInt)) {
    return res.status(400).json({ error: 'window must be 7, 30, or 90' });
  }

  // Validate and bound days
  let days = DEFAULT_DAYS;
  if (daysParam) {
    const parsed = parseInt(daysParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return res.status(400).json({ error: 'days must be a positive number' });
    }
    days = Math.min(parsed, MAX_DAYS);
  }

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch historical oscillators
    let oscillators;
    if (coinId) {
      // Per-coin historical data
      oscillators = await sql`
        SELECT
          "calculatedAt",
          "zScore",
          "currentAvgStreak",
          "currentSampleSize",
          "windowStartDate",
          "windowEndDate"
        FROM "TrendStreakOscillator"
        WHERE "coinId" = ${coinId}
          AND "trendType" = ${trendType.toUpperCase()}
          AND "window" = ${windowInt}
          AND "calculatedAt" >= ${cutoffDate.toISOString()}
        ORDER BY "calculatedAt" ASC
      `;
    } else {
      // Market-wide historical data
      oscillators = await sql`
        SELECT
          "calculatedAt",
          "zScore",
          "currentAvgStreak",
          "currentSampleSize",
          "windowStartDate",
          "windowEndDate"
        FROM "TrendStreakOscillator"
        WHERE "coinId" IS NULL
          AND "trendType" = ${trendType.toUpperCase()}
          AND "window" = ${windowInt}
          AND "calculatedAt" >= ${cutoffDate.toISOString()}
        ORDER BY "calculatedAt" ASC
      `;
    }

    if (oscillators.length === 0) {
      return res.status(200).json({
        coinId: coinId || null,
        trendType: trendType.toUpperCase(),
        window: windowInt,
        days,
        data: [],
        message: 'No historical oscillator data found'
      });
    }

    // Get coin info if coinId provided
    let coinInfo = null;
    if (coinId) {
      const coin = await sql`
        SELECT id, symbol, name
        FROM "Coin"
        WHERE id = ${coinId}
        LIMIT 1
      `;
      coinInfo = coin[0] || null;
    }

    // Format response
    const response = {
      coinId: coinId || null,
      symbol: coinInfo?.symbol || null,
      name: coinInfo?.name || null,
      trendType: trendType.toUpperCase(),
      window: windowInt,
      days,
      data: oscillators.map(o => ({
        date: o.calculatedAt.toISOString().split('T')[0],
        timestamp: o.calculatedAt,
        zScore: parseFloat(o.zScore),
        currentAvgStreak: parseFloat(o.currentAvgStreak),
        currentSampleSize: o.currentSampleSize,
        windowStartDate: o.windowStartDate,
        windowEndDate: o.windowEndDate
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching historical oscillators:', error);
    return res.status(500).json({
      error: 'Failed to fetch historical oscillator data',
      details: error.message
    });
  }
}
