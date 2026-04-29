import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const session = await auth();
  if (!session) redirect("/admin/login?from=/wholesale");
  if (session.user.role !== "WHOLESALER" && session.user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Wholesale</h1>
        <p className="mt-2 text-zinc-500">Your account is not approved for wholesale yet.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Wholesale</h1>
      <p className="mt-2 text-zinc-500">B2B catalog and bulk ordering — MVP-4.</p>
    </div>
  );
}
