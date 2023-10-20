-- CreateTable
CREATE TABLE "WhiteListAddress" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,

    CONSTRAINT "WhiteListAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhiteListAddress_ip_key" ON "WhiteListAddress"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteListAddress_walletAddress_key" ON "WhiteListAddress"("walletAddress");
