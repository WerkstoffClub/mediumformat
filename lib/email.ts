import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

const log = logger.child({ component: "email" });

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  const t = transport();
  const from = process.env.SMTP_FROM ?? "Medium Format <no-reply@mediumformat.info>";
  if (!t) {
    // Dev / unconfigured: log so the flow is still testable.
    log.warn({ to, subject }, "SMTP not configured — email not sent");
    return false;
  }
  await t.sendMail({ from, to, subject, html, text: html.replace(/<[^>]+>/g, "") });
  return true;
}

const idr = (n: number) => `IDR ${Math.round(n).toLocaleString("en-US")}`;

export async function sendOrderConfirmationEmail(
  to: string,
  order: {
    number: string;
    items: { qty: number; name: string; lineTotal: number }[];
    shippingFee: number;
    total: number;
  },
) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.qty}× ${i.name}</td><td align="right">${idr(i.lineTotal)}</td></tr>`,
    )
    .join("");
  const html = `
    <h2>Thanks for your order</h2>
    <p>Order <strong>${order.number}</strong> is confirmed. Here's your summary:</p>
    <table style="width:100%;max-width:480px;border-collapse:collapse;font-size:14px">
      ${rows}
      ${order.shippingFee ? `<tr><td style="padding:4px 0">Shipping</td><td align="right">${idr(order.shippingFee)}</td></tr>` : ""}
      <tr><td style="padding:8px 0;border-top:1px solid #ddd"><strong>Total</strong></td><td align="right" style="border-top:1px solid #ddd"><strong>${idr(order.total)}</strong></td></tr>
    </table>
    <p>We'll email shipping updates as your order moves. — Medium Format, Jakarta</p>`;
  return sendMail(to, `Your Medium Format order ${order.number}`, html);
}

export async function sendPasswordResetEmail(to: string, link: string) {
  const html = `
    <p>Someone requested a password reset for your Medium Format account.</p>
    <p><a href="${link}">Reset your password</a></p>
    <p>Or paste this link: ${link}</p>
    <p>This link expires in 1 hour. If you didn't request it, you can ignore this email.</p>`;
  return sendMail(to, "Reset your Medium Format password", html);
}
