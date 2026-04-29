import { NextResponse } from "next/server";

// Discogs has no webhooks; we poll. This endpoint is reserved for future use.
export async function POST() {
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
