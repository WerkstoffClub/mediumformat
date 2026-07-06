import { auth } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();

  if (!session) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">Sign in</h1>
        <p className="page-lead">Customer accounts are coming soon.</p>
        <Link href="/admin/login" className="page-link">
          Staff login →
        </Link>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <h1 className="page-title">
        Hello, {session.user.name ?? session.user.email}
      </h1>
      <p className="page-lead">
        Orders, wantlist, addresses and messages will live here.
      </p>
    </div>
  );
}
