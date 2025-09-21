/*
  Warnings:

  - You are about to drop the column `address` on the `Market` table. All the data in the column will be lost.
  - You are about to drop the column `fee` on the `Market` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Market_address_key";

-- AlterTable
ALTER TABLE "public"."Market" DROP COLUMN "address",
DROP COLUMN "fee";

-- AlterTable
ALTER TABLE "public"."NFTPosition" ALTER COLUMN "onChainId" DROP NOT NULL;
