import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// A logged-in WHOLESALER whose profile is approved gets wholesale pricing.
export async function isWholesaleCustomer(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "WHOLESALER") return false;
  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
  });
  return !!profile?.wholesaleApproved;
}

// Effective unit price for a variant given whether wholesale pricing applies.
export function effectivePrice(
  v: { priceIdr: unknown; wholesalePriceIdr?: unknown },
  wholesale: boolean,
): number {
  if (wholesale && v.wholesalePriceIdr != null) {
    return Number(String(v.wholesalePriceIdr));
  }
  return Number(String(v.priceIdr));
}
