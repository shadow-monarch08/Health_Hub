/*
  Warnings:

  - You are about to drop the column `verificationExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "verificationExpiresAt",
DROP COLUMN "verificationToken";
