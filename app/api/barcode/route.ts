import { NextResponse } from "next/server";
import { renderCode128, renderEan13 } from "@/lib/barcode/render";

export const dynamic = "force-dynamic";

// GET /api/barcode?text=MF-000123&type=code128  → PNG barcode image.
// Embed with <img src="/api/barcode?text=…"> on label sheets.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? searchParams.get("sku") ?? "").trim();
  const type = searchParams.get("type") ?? "code128";
  if (!text) return new NextResponse("missing text", { status: 400 });

  try {
    const png = type === "ean13" ? await renderEan13(text) : await renderCode128(text);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("barcode error", { status: 400 });
  }
}
