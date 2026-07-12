import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import "../admin.css";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/admin/dashboard");
  try {
    await signIn("credentials", { email, password, redirectTo: from });
  } catch (err) {
    if ((err as Error).message === "NEXT_REDIRECT") throw err;
    redirect(`/admin/login?error=invalid&from=${encodeURIComponent(from)}`);
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  return (
    <div className="mfa">
      <div className="login-wrap">
        <form action={login} className="login-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/MF_Logo/SVG/MF_Lockup_White.svg"
            alt="Medium Format"
            className="login-logo"
          />
          <h1>Sign in</h1>
          <p className="login-sub">Staff and admin access.</p>

          <input type="hidden" name="from" value={from ?? "/admin/dashboard"} />

          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {error === "invalid" && (
            <p className="login-error">Invalid email or password.</p>
          )}

          <button type="submit" className="btn-primary">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
