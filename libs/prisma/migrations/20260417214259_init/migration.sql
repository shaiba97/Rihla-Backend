/*
  Warnings:

  - You are about to drop the column `leftSideSeatsPerRow` on the `Bus` table. All the data in the column will be lost.
  - You are about to drop the column `rightSideSeatsPerRow` on the `Bus` table. All the data in the column will be lost.
  - Added the required column `left` to the `Bus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `right` to the `Bus` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bus" DROP COLUMN "leftSideSeatsPerRow",
DROP COLUMN "rightSideSeatsPerRow",
ADD COLUMN     "left" INTEGER NOT NULL,
ADD COLUMN     "right" INTEGER NOT NULL;
