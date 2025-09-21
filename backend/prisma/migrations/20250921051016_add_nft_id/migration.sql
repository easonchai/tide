/*
  Warnings:

  - You are about to drop the column `marketSummary` on the `Market` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Market` table. All the data in the column will be lost.
  - You are about to drop the `PerpetualPosition` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `onChainId` to the `NFTPosition` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."PerpetualPosition" DROP CONSTRAINT "PerpetualPosition_nftPositionId_fkey";

-- AlterTable
ALTER TABLE "public"."Market" DROP COLUMN "marketSummary",
DROP COLUMN "rules";

-- AlterTable
ALTER TABLE "public"."NFTPosition" ADD COLUMN     "onChainId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."PerpetualPosition";
