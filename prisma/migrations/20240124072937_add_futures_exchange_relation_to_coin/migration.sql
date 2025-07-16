-- AlterTable
ALTER TABLE "Coin" ADD COLUMN     "futuresExchangeId" TEXT;

-- AddForeignKey
ALTER TABLE "Coin" ADD CONSTRAINT "Coin_futuresExchangeId_fkey" FOREIGN KEY ("futuresExchangeId") REFERENCES "Exchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
