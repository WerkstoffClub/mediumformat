"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut, auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

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

// ── Password reset ──
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      await prisma.verificationToken.create({ data: { identifier: email, token, expires } });
      const base = process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
      try {
        await sendPasswordResetEmail(email, `${base}/account/reset?token=${token}`);
      } catch {
        // Swallow — never reveal delivery state to the requester.
      }
    }
  }
  // Always report success (don't disclose whether the email exists).
  redirect("/account/forgot?sent=1");
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!token || password.length < 8) {
    redirect(`/account/reset?token=${encodeURIComponent(token)}&error=invalid`);
  }
  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  if (!vt || vt.expires < new Date()) redirect("/account/reset?error=expired");

  const user = await prisma.user.findUnique({ where: { email: vt!.identifier } });
  if (!user) redirect("/account/reset?error=expired");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user!.id }, data: { passwordHash } });
  await prisma.verificationToken.deleteMany({ where: { identifier: vt!.identifier } });
  redirect("/account?reset=1");
}

// ── Saved addresses ──
export async function addAddress(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  const userId = session!.user.id;

  const count = await prisma.address.count({ where: { userId } });
  const makeDefault = count === 0 || formData.get("isDefault") === "on";
  if (makeDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  await prisma.address.create({
    data: {
      userId,
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      line1: String(formData.get("line1") ?? "").trim(),
      line2: String(formData.get("line2") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim(),
      province: String(formData.get("province") ?? "").trim(),
      postal: String(formData.get("postal") ?? "").trim(),
      country: String(formData.get("country") ?? "ID").trim() || "ID",
      isDefault: makeDefault,
    },
  });
  revalidatePath("/account");
  redirect("/account");
}

export async function deleteAddress(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  const id = String(formData.get("id") ?? "");
  // Scope the delete to the owner.
  await prisma.address.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/account");
  redirect("/account");
}

export async function setDefaultAddress(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/account");
  const userId = session.user.id;
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.address.findFirst({ where: { id, userId } });
  if (owned) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    await prisma.address.update({ where: { id }, data: { isDefault: true } });
  }
  revalidatePath("/account");
  redirect("/account");
}
