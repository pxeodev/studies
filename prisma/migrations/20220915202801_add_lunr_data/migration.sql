/*
  Warnings:

  - A unique constraint covering the columns `[coinId,quoteSymbol,closeTime]` on the table `Ohlc` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Coin_marketCapRank_idx";

-- DropIndex
DROP INDEX "Ohlc_closeTime_idx";

-- DropIndex
DROP INDEX "Ohlc_coinId_quoteSymbol_closeTime_key";

-- DropIndex
DROP INDEX "Ohlc_coinId_quoteSymbol_idx";

-- AlterTable
ALTER TABLE "Coin" ADD COLUMN     "lunrAltRank" DECIMAL(65,30),
ADD COLUMN     "lunrAltRankPrevious" DECIMAL(65,30),
ADD COLUMN     "lunrAverageSentiment" DECIMAL(65,30),
ADD COLUMN     "lunrCategories" TEXT[],
ADD COLUMN     "lunrCurrentPrice" DECIMAL(65,30),
ADD COLUMN     "lunrGalaxyScore" INTEGER,
ADD COLUMN     "lunrGalaxyScorePrevious" DECIMAL(65,30),
ADD COLUMN     "lunrInternalId" INTEGER,
ADD COLUMN     "lunrMarketCap" DECIMAL(65,30),
ADD COLUMN     "lunrMarketDominance" DECIMAL(65,30),
ADD COLUMN     "lunrName" TEXT,
ADD COLUMN     "lunrPercentageChange1h" DECIMAL(65,30),
ADD COLUMN     "lunrPercentageChange24h" DECIMAL(65,30),
ADD COLUMN     "lunrSocialContributors" INTEGER,
ADD COLUMN     "lunrSocialDominance" DECIMAL(65,30),
ADD COLUMN     "lunrSocialScore" DECIMAL(65,30),
ADD COLUMN     "lunrSocialVolume" DECIMAL(65,30),
ADD COLUMN     "lunrSymbol" TEXT,
ADD COLUMN     "lunrVolume" DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "Coin_marketCapRank_idx" ON "Coin"("marketCapRank");

-- CreateIndex
CREATE INDEX "Ohlc_coinId_quoteSymbol_idx" ON "Ohlc"("coinId", "quoteSymbol");

-- CreateIndex
CREATE INDEX "Ohlc_closeTime_idx" ON "Ohlc"("closeTime" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Ohlc_coinId_quoteSymbol_closeTime_key" ON "Ohlc"("coinId", "quoteSymbol", "closeTime");
