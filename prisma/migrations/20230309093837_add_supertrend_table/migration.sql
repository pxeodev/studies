-- CreateTable
CREATE TABLE "SuperTrend" (
    "id" SERIAL NOT NULL,
    "coinId" VARCHAR(255) NOT NULL,
    "quoteSymbol" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "trend" TEXT NOT NULL,

    CONSTRAINT "SuperTrend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperTrend_coinId_quoteSymbol_date_key" ON "SuperTrend"("coinId", "quoteSymbol", "date");

-- AddForeignKey
ALTER TABLE "SuperTrend" ADD CONSTRAINT "SuperTrend_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "Coin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
