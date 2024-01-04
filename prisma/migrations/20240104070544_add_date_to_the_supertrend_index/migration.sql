-- DropIndex
DROP INDEX "SuperTrend_coinId_flavor_weekly_idx";

-- CreateIndex
CREATE INDEX "SuperTrend_coinId_flavor_weekly_date_idx" ON "SuperTrend"("coinId", "flavor", "weekly", "date");
