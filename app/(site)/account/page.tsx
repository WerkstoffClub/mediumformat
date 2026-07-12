import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { GoogleButton } from "@/components/site/GoogleButton";
import { loginCustomer, signOutCustomer } from "./actions";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase();
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const { error, registered } = await searchParams;
  const session = await auth();

  // ── Logged out: sign-in form ──
  if (!session) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">Sign in</h1>
        <p className="page-lead">Access your orders, wishlist and addresses.</p>

        {registered && (
          <p className="page-lead" style={{ color: "var(--success)" }}>
            Account created — signing you in.
          </p>
        )}

        <form action={loginCustomer} style={{ marginTop: 20 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {error === "invalid" && (
            <p className="page-lead" style={{ color: "var(--danger, #ef4444)" }}>
              Invalid email or password.
            </p>
          )}
          <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
            Sign in
          </button>
        </form>

        <GoogleButton />

        <p className="page-lead" style={{ marginTop: 18 }}>
          New here?{" "}
          <Link href="/account/register" className="page-link" style={{ marginTop: 0 }}>
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  // ── Logged in: dashboard ──
  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Hello, {session.user.name ?? session.user.email}</h1>
          <p className="page-lead">{session.user.email}</p>
        </div>
        <form action={signOutCustomer}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </div>

      <h2 className="sec-h2" style={{ marginTop: 32, marginBottom: 16 }}>Your orders</h2>
      {orders.length === 0 ? (
        <div className="empty">
          No orders yet.{" "}
          <Link href="/shop" className="page-link" style={{ marginTop: 0 }}>Browse the shop</Link>
        </div>
      ) : (
        <div className="rd-facts">
          {orders.map((o) => (
            <div className="fact-row" key={o.id}>
              <span className="fact-k">
                <span className="mono">{o.number}</span> · {o._count.items} item
                {o._count.items === 1 ? "" : "s"} ·{" "}
                {o.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="fact-v">
                {statusLabel(o.status)} · {formatIdr(o.total.toString())}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
