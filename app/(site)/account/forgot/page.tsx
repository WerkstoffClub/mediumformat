import Link from "next/link";
import { requestPasswordReset } from "../actions";

export const dynamic = "force-dynamic";

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="page-narrow">
      <h1 className="page-title">Reset password</h1>
      {sent ? (
        <>
          <p className="page-lead">
            If an account exists for that email, we&apos;ve sent a reset link. Check your
            inbox (and spam) — the link expires in an hour.
          </p>
          <Link href="/account" className="page-link">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <p className="page-lead">Enter your email and we&apos;ll send a reset link.</p>
          <form action={requestPasswordReset} style={{ marginTop: 20 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
              Send reset link
            </button>
          </form>
          <p className="page-lead" style={{ marginTop: 18 }}>
            <Link href="/account" className="page-link" style={{ marginTop: 0 }}>
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
