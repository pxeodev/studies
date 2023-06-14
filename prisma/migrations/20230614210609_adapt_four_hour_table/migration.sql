/*
  Warnings:

  - You are about to drop the column `coinId` on the `FourHourTrends` table. All the data in the column will be lost.
  - You are about to drop the column `quoteSymbol` on the `FourHourTrends` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[coinSymbol,date]` on the table `FourHourTrends` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `coinSymbol` to the `FourHourTrends` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FourHourTrends" DROP CONSTRAINT "FourHourTrends_coinId_fkey";

-- DropIndex
DROP INDEX "FourHourTrends_coinId_quoteSymbol_date_key";

-- AlterTable
ALTER TABLE "FourHourTrends" DROP COLUMN "coinId",
DROP COLUMN "quoteSymbol",
ADD COLUMN     "categories" TEXT[],
ADD COLUMN     "coinSymbol" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FourHourTrends_coinSymbol_date_key" ON "FourHourTrends"("coinSymbol", "date");
