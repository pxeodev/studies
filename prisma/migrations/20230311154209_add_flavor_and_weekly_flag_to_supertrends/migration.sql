/*
  Warnings:

  - Added the required column `flavor` to the `SuperTrend` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SuperTrend" ADD COLUMN     "flavor" TEXT NOT NULL,
ADD COLUMN     "weekly" BOOLEAN NOT NULL DEFAULT false;
