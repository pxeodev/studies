/*
  Warnings:

  - A unique constraint covering the columns `[coinId,quoteSymbol,date,flavor,weekly]` on the table `SuperTrend` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SuperTrend_coinId_quoteSymbol_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "SuperTrend_coinId_quoteSymbol_date_flavor_weekly_key" ON "SuperTrend"("coinId", "quoteSymbol", "date", "flavor", "weekly");
