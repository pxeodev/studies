-- CreateTable
CREATE TABLE "FourHourTrends" (
    "id" SERIAL NOT NULL,
    "coinId" VARCHAR(255) NOT NULL,
    "quoteSymbol" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "trend" TEXT NOT NULL,

    CONSTRAINT "FourHourTrends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FourHourTrends_coinId_quoteSymbol_date_key" ON "FourHourTrends"("coinId", "quoteSymbol", "date");

-- AddForeignKey
ALTER TABLE "FourHourTrends" ADD CONSTRAINT "FourHourTrends_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
