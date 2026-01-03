/**
 * API endpoint to fetch market-wide oscillator data
 * Returns aggregated z-score oscillator values across all coins
 */
import sql from '../../../lib/database.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trendType, window } = req.query;

  try {
    // Get latest market-wide oscillators (coinId IS NULL)
    const oscillators = await sql`
      WITH latest AS (
        SELECT
          "trendType",
          "window",
          MAX("calculatedAt") as latest_calc
        FROM "TrendStreakOscillator"
        WHERE "coinId" IS NULL
        ${trendType ? sql`AND "trendType" = ${trendType.toUpperCase()}` : sql``}
        ${window ? sql`AND "window" = ${parseInt(window, 10)}` : sql``}
        GROUP BY "trendType", "window"
      )
      SELECT
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
      WHERE o."coinId" IS NULL
      ORDER BY o."trendType", o."window"
    `;

    if (oscillators.length === 0) {
      return res.status(200).json({
        oscillators: [],
        message: 'No market-wide oscillator data found'
      });
    }

    // Format response
    const response = {
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
    console.error('Error fetching market oscillators:', error);
    return res.status(500).json({
      error: 'Failed to fetch market oscillator data',
      details: error.message
    });
  }
}
