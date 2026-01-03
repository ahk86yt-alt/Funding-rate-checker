-- AlterTable
ALTER TABLE "Alert" ADD COLUMN "lastSentAt" DATETIME;
ALTER TABLE "Alert" ADD COLUMN "lastSentRate" REAL;

-- CreateTable
CREATE TABLE "FundingPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FundingRateRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FundingPoint_exchange_symbol_createdAt_idx" ON "FundingPoint"("exchange", "symbol", "createdAt");

-- CreateIndex
CREATE INDEX "FundingPoint_createdAt_idx" ON "FundingPoint"("createdAt");

-- CreateIndex
CREATE INDEX "FundingRateRecord_exchange_symbol_createdAt_idx" ON "FundingRateRecord"("exchange", "symbol", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_exchange_symbol_idx" ON "Alert"("exchange", "symbol");
