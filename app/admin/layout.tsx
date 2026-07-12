import { auth, signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import "./admin.css";

function initials(name?: string | null, email?: string | null): string {
  const src = (name ?? email ?? "MF").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  // Login page renders without the shell; middleware gates access.
  if (!session) return <>{children}</>;

  const user = session.user;

  return (
    <div className="mfa">
      <div className="shell">
        {/* Sidebar */}
        <aside className="sidebar" id="adminnav">
          <a href="/admin/dashboard" className="sb-brand" aria-label="Medium Format">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/MF_Logo/SVG/MF_Lockup_White.svg" alt="Medium Format" />
          </a>

          <AdminNav />

          <div className="sb-foot">
            <div className="sb-user">
              <div className="sb-avatar">{initials(user.name, user.email)}</div>
              <div>
                <div className="sb-user-name">{user.name ?? user.email}</div>
                <div className="sb-user-role">{user.role?.toLowerCase()}</div>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button type="submit" className="sb-signout">
                <LogOut strokeWidth={1.6} /> Sign out
              </button>
            </form>
          </div>
        </aside>
        <a href="#" className="sb-scrim" aria-hidden="true" tabIndex={-1} />

        {/* Main */}
        <div className="main">
          <header className="topbar">
            <a href="#adminnav" className="hamburger" aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </a>
            <nav className="crumb" aria-label="Breadcrumb">
              <span className="c-mute">Medium Format</span>
              <span className="c-mute">/</span>
              <span className="c-ink">Back office</span>
            </nav>
            <div className="topbar-spacer" />
            <div className="tb-right">
              <button type="button" className="tb-btn" aria-label="Notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>
          </header>

          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}
