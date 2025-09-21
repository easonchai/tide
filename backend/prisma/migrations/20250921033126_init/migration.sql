-- CreateEnum
CREATE TYPE "public"."MarketStatus" AS ENUM ('OPEN', 'CLOSED', 'RESOLVED', 'PAUSED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Market" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "public"."MarketStatus" NOT NULL DEFAULT 'OPEN',
    "marketSummary" TEXT,
    "rules" TEXT,
    "tags" TEXT[],
    "profileImage" TEXT,
    "slug" TEXT NOT NULL,
    "fee" BIGINT NOT NULL DEFAULT 20000000000000000,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NFTPosition" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "payout" BIGINT NOT NULL,
    "lowerBound" BIGINT NOT NULL,
    "upperBound" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "NFTPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PerpetualPosition" (
    "id" TEXT NOT NULL,
    "nftPositionId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PerpetualPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "public"."User"("address");

-- CreateIndex
CREATE INDEX "User_address_idx" ON "public"."User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Market_address_key" ON "public"."Market"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Market_slug_key" ON "public"."Market"("slug");

-- CreateIndex
CREATE INDEX "Market_slug_idx" ON "public"."Market"("slug");

-- CreateIndex
CREATE INDEX "NFTPosition_marketId_idx" ON "public"."NFTPosition"("marketId");

-- CreateIndex
CREATE INDEX "NFTPosition_userId_idx" ON "public"."NFTPosition"("userId");

-- CreateIndex
CREATE INDEX "PerpetualPosition_nftPositionId_idx" ON "public"."PerpetualPosition"("nftPositionId");

-- AddForeignKey
ALTER TABLE "public"."NFTPosition" ADD CONSTRAINT "NFTPosition_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "public"."Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NFTPosition" ADD CONSTRAINT "NFTPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PerpetualPosition" ADD CONSTRAINT "PerpetualPosition_nftPositionId_fkey" FOREIGN KEY ("nftPositionId") REFERENCES "public"."NFTPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
