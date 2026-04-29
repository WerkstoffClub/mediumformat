import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

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
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <form
        action={login}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-6 flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="inline-block h-3 w-3 rounded-full bg-[var(--color-mf-accent)]" />
          MEDIUM·FORMAT
        </div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Staff and admin access.</p>

        <input type="hidden" name="from" value={from ?? "/admin/dashboard"} />

        <label className="mt-6 block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        {error === "invalid" && (
          <p className="mt-3 text-sm text-red-600">Invalid email or password.</p>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
