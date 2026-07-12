"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerCustomer(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) redirect("/account/register?error=invalid");
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/account/register?error=exists");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, name, role: "CUSTOMER", passwordHash } });

  // signIn throws NEXT_REDIRECT on success; re-throw it.
  try {
    await signIn("credentials", { email, password, redirectTo: "/account" });
  } catch (err) {
    if ((err as Error).message === "NEXT_REDIRECT") throw err;
    redirect("/account?registered=1");
  }
}

export async function loginCustomer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirectTo: "/account" });
  } catch (err) {
    if ((err as Error).message === "NEXT_REDIRECT") throw err;
    redirect("/account?error=invalid");
  }
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutCustomer() {
  await signOut({ redirectTo: "/account" });
}
