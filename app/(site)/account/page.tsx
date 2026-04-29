import { auth } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-zinc-500">Customer login coming in MVP-2.</p>
        <Link href="/admin/login" className="mt-4 inline-block text-sm underline">
          Staff login
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Hello, {session.user.name ?? session.user.email}</h1>
      <p className="mt-2 text-zinc-500">Orders, wantlist, addresses, and messages will live here.</p>
    </div>
  );
}
