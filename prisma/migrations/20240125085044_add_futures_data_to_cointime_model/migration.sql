-- AlterTable
ALTER TABLE "CoinTime" ADD COLUMN     "fundingRate" DECIMAL(65,30),
ADD COLUMN     "futuresVolume24h" DECIMAL(65,30),
ADD COLUMN     "openInterest" DECIMAL(65,30);
