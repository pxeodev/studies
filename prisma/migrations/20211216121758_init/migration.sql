-- CreateTable
CREATE TABLE "Coin" (
    "id" VARCHAR(255) NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categories" TEXT[],
    "icon_url" TEXT NOT NULL,

    CONSTRAINT "Coin_pkey" PRIMARY KEY ("id")
);
