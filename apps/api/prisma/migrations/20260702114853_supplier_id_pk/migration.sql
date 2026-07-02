-- AlterTable
ALTER TABLE "DpSupplier" DROP CONSTRAINT "DpSupplier_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "DpSupplier_pkey" PRIMARY KEY ("id");

