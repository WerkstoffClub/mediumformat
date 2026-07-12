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
        token.role = (user as { role?: Role }).role;
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
