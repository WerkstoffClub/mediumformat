import { NextResponse } from "next/server";
import { biteship } from "@/lib/integrations/biteship/client";

export const dynamic = "force-dynamic";

// GET /api/shipping/rates?postal=12160&weight=700  → courier options.
// Doubles as address validation: an unroutable postal returns rates: [] + error.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postal = (searchParams.get("postal") ?? "").trim();
  const weight = Math.max(100, Number(searchParams.get("weight") ?? "0") || 500);
  const origin = process.env.BITESHIP_ORIGIN_POSTAL;

  if (!process.env.BITESHIP_API_KEY || !origin) {
    return NextResponse.json({ rates: [], error: "Shipping is not configured yet." });
  }
  if (!/^\d{5}$/.test(postal)) {
    return NextResponse.json({ rates: [], error: "Enter a valid 5-digit postal code." });
  }

  try {
    const res = (await biteship.rates({
      origin_postal_code: Number(origin),
      destination_postal_code: Number(postal),
      couriers: process.env.BITESHIP_COURIERS ?? "jne,jnt,sicepat,anteraja,pos,ninja",
      items: [{ name: "Order", value: 0, weight, quantity: 1 }],
    })) as {
      pricing?: Array<{
        courier_code: string;
        courier_service_code: string;
        courier_name: string;
        courier_service_name: string;
        price: number;
        duration?: string;
        shipment_duration_range?: string;
      }>;
    };

    const rates = (res.pricing ?? []).map((p) => ({
      id: `${p.courier_code}:${p.courier_service_code}`,
      label: `${p.courier_name} · ${p.courier_service_name}`,
      eta: p.duration ?? p.shipment_duration_range ?? "",
      price: p.price,
    }));

    if (rates.length === 0) {
      return NextResponse.json({ rates: [], error: "No couriers found for that address." });
    }
    return NextResponse.json({ rates });
  } catch {
    return NextResponse.json({ rates: [], error: "Couldn't fetch rates — check the postal code." });
  }
}
