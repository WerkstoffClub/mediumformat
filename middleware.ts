import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
const STAFF_ROLES = new Set(["ADMIN", "STAFF", "SHOPKEEPER"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminArea = pathname.startsWith("/admin");
  const isLogin = pathname === "/admin/login";

  if (isAdminArea && !isLogin) {
    const role = req.auth?.user?.role;
    if (!req.auth || !role || !STAFF_ROLES.has(role)) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/wholesale/:path*"],
};
