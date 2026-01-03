/**
 * API endpoint to fetch oscillator data for a specific coin
 * Returns latest z-score oscillator values across trend types and windows
 */
import sql from '../../../lib/database.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coinId, trendType, window } = req.query;

  if (!coinId) {
    return res.status(400).json({ error: 'coinId required' });
  }

  try {
    // Build query with optional filters
    let query = sql`
      SELECT
        "coinId",
        "trendType",
        "window",
        "calculatedAt",
        "currentAvgStreak",
        "currentSampleSize",
        "historicalMean",
        "historicalStdDev",
        "historicalSampleSize",
        "zScore",
        "windowStartDate",
        "windowEndDate"
      FROM "TrendStreakOscillator"
      WHERE "coinId" = ${coinId}
    `;

    // Add optional filters
    const conditions = [];
    if (trendType) {
      conditions.push(sql`AND "trendType" = ${trendType.toUpperCase()}`);
    }
    if (window) {
      const windowInt = parseInt(window, 10);
      if (isNaN(windowInt) || ![7, 30, 90].includes(windowInt)) {
        return res.status(400).json({ error: 'window must be 7, 30, or 90' });
      }
      conditions.push(sql`AND "window" = ${windowInt}`);
    }

    // Get latest oscillators (most recent calculatedAt for each combination)
    const oscillators = await sql`
      WITH latest AS (
        SELECT
          "trendType",
          "window",
          MAX("calculatedAt") as latest_calc
        FROM "TrendStreakOscillator"
        WHERE "coinId" = ${coinId}
        ${trendType ? sql`AND "trendType" = ${trendType.toUpperCase()}` : sql``}
        ${window ? sql`AND "window" = ${parseInt(window, 10)}` : sql``}
        GROUP BY "trendType", "window"
      )
      SELECT
        o."coinId",
        o."trendType",
        o."window",
        o."calculatedAt",
        o."currentAvgStreak",
        o."currentSampleSize",
        o."historicalMean",
        o."historicalStdDev",
        o."historicalSampleSize",
        o."zScore",
        o."windowStartDate",
        o."windowEndDate"
      FROM "TrendStreakOscillator" o
      INNER JOIN latest l
        ON o."trendType" = l."trendType"
        AND o."window" = l."window"
        AND o."calculatedAt" = l.latest_calc
      WHERE o."coinId" = ${coinId}
      ORDER BY o."trendType", o."window"
    `;

    if (oscillators.length === 0) {
      return res.status(200).json({
        coinId,
        oscillators: [],
        message: 'No oscillator data found for this coin'
      });
    }

    // Get coin info
    const coinInfo = await sql`
      SELECT id, symbol, name
      FROM "Coin"
      WHERE id = ${coinId}
      LIMIT 1
    `;

    // Format response
    const response = {
      coinId,
      symbol: coinInfo[0]?.symbol || null,
      name: coinInfo[0]?.name || null,
      oscillators: oscillators.map(o => ({
        trendType: o.trendType,
        window: o.window,
        zScore: parseFloat(o.zScore),
        currentAvgStreak: parseFloat(o.currentAvgStreak),
        currentSampleSize: o.currentSampleSize,
        historicalMean: parseFloat(o.historicalMean),
        historicalStdDev: parseFloat(o.historicalStdDev),
        historicalSampleSize: o.historicalSampleSize,
        windowStartDate: o.windowStartDate,
        windowEndDate: o.windowEndDate,
        calculatedAt: o.calculatedAt
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching coin oscillators:', error);
    return res.status(500).json({
      error: 'Failed to fetch oscillator data',
      details: error.message
    });
  }
}
