import Link from "next/link";
import { registerCustomer } from "../actions";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="page-narrow">
      <h1 className="page-title">Create account</h1>
      <p className="page-lead">Save your details for faster checkout.</p>

      <form action={registerCustomer} style={{ marginTop: 20 }}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input className="input" id="name" name="name" required autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>

        {error === "exists" && (
          <p className="page-lead" style={{ color: "var(--danger, #ef4444)" }}>
            An account with that email already exists.{" "}
            <Link href="/account" className="page-link" style={{ marginTop: 0 }}>Sign in</Link>
          </p>
        )}
        {error === "invalid" && (
          <p className="page-lead" style={{ color: "var(--danger, #ef4444)" }}>
            Check your details — password must be at least 8 characters.
          </p>
        )}

        <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
          Create account
        </button>
      </form>

      <p className="page-lead" style={{ marginTop: 18 }}>
        Already have an account?{" "}
        <Link href="/account" className="page-link" style={{ marginTop: 0 }}>Sign in</Link>
      </p>
    </div>
  );
}
