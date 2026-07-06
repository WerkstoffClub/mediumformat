import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const session = await auth();
  if (!session) redirect("/admin/login?from=/wholesale");

  if (session.user.role !== "WHOLESALER" && session.user.role !== "ADMIN") {
    return (
      <div className="page-narrow">
        <h1 className="page-title">Wholesale</h1>
        <p className="page-lead">
          Your account is not approved for wholesale yet.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Wholesale</h1>
      <p className="page-lead">B2B catalogue and bulk ordering.</p>
    </div>
  );
}
