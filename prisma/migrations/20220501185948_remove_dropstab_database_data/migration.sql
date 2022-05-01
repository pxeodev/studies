/*
  Warnings:

  - You are about to drop the `DropsTab` table. If the table is not empty, all the data it contains will be lost.
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

-- DropTable
DROP TABLE "DropsTab";

-- CreateIndex
CREATE INDEX "Coin_marketCapRank_idx" ON "Coin"("marketCapRank");

-- CreateIndex
CREATE INDEX "Ohlc_coinId_quoteSymbol_idx" ON "Ohlc"("coinId", "quoteSymbol");

-- CreateIndex
CREATE INDEX "Ohlc_closeTime_idx" ON "Ohlc"("closeTime" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Ohlc_coinId_quoteSymbol_closeTime_key" ON "Ohlc"("coinId", "quoteSymbol", "closeTime");
