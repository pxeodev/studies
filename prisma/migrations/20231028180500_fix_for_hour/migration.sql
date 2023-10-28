/*
  Warnings:

  - You are about to drop the column `coinSymbol` on the `FourHourTrends` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `FourHourTrends` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "FourHourTrends_coinSymbol_date_key";

-- AlterTable
ALTER TABLE "FourHourTrends" DROP COLUMN "coinSymbol",
DROP COLUMN "date",
ADD COLUMN     "coinsymbol" VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN     "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
