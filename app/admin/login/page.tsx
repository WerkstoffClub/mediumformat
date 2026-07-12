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

async function googleLogin() {
  "use server";
  await signIn("google", { redirectTo: "/admin/dashboard" });
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", color: "var(--mute)", fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
            or
            <span style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          </div>
          <button type="submit" formAction={googleLogin} className="btn-sec" style={{ width: "100%", justifyContent: "center", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41.9 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
