// Edge-safe Auth.js config. Imported by middleware (which runs on the Edge
// runtime and cannot use Prisma / bcrypt). The full config in lib/auth.ts
// extends this with the Credentials provider and the Prisma adapter.

import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      email?: string | null;
      name?: string | null;
    };
  }
  interface User {
    role?: Role;
  }
}

export const authConfig: NextAuthConfig = {
  // Behind the nginx reverse proxy in production; required for OAuth callbacks.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [], // populated in lib/auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: Role }).role ?? "CUSTOMER";
        // Promote allow-listed emails (e.g. staff signing in with Google) to
        // ADMIN. Env-only so this stays edge-safe for the middleware.
        const allow = (process.env.ADMIN_GOOGLE_EMAILS ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const email = (user.email ?? "").toLowerCase();
        if (email && allow.includes(email)) token.role = "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as Role) ?? "CUSTOMER";
      }
      return session;
    },
  },
};
