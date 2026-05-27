-- CreateEnum
CREATE TYPE "SeatStartFrom" AS ENUM ('LEFT', 'RIGHT');

-- CreateTable
CREATE TABLE "Bus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chairs" INTEGER NOT NULL,
    "leftSideSeatsPerRow" INTEGER NOT NULL,
    "rightSideSeatsPerRow" INTEGER NOT NULL,
    "seatStartFrom" "SeatStartFrom" NOT NULL,
    "plate" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "presence_time" TIMESTAMP(3) NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "fromState" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "fromStation" TEXT NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "toState" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_fromCity_toCity_idx" ON "Trip"("fromCity", "toCity");

-- CreateIndex
CREATE INDEX "Trip_departureDate_idx" ON "Trip"("departureDate");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
