import Link from "next/link";
import { resetPassword } from "../actions";

export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (error === "expired" || !token) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">Link expired</h1>
        <p className="page-lead">This reset link is invalid or has expired.</p>
        <Link href="/account/forgot" className="page-link">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <h1 className="page-title">Choose a new password</h1>
      <form action={resetPassword} style={{ marginTop: 20 }}>
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {error === "invalid" && (
          <p className="page-lead" style={{ color: "var(--danger, #ef4444)" }}>
            Password must be at least 8 characters.
          </p>
        )}
        <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
          Update password
        </button>
      </form>
    </div>
  );
}
