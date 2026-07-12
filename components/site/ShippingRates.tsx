"use client";

import { useState } from "react";
import { formatIdr } from "@/lib/format";

type Rate = { id: string; label: string; eta: string; price: number };

// Postal entry + Biteship courier picker. Selected rate is written into hidden
// inputs (shippingFee, shippingLabel, postal) that the checkout form submits.
export function ShippingRates({
  weightGrams,
  cartTotal,
}: {
  weightGrams: number;
  cartTotal: number;
}) {
  const [postal, setPostal] = useState("");
  const [rates, setRates] = useState<Rate[]>([]);
  const [selected, setSelected] = useState<Rate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function calc() {
    setError(null);
    setSelected(null);
    setRates([]);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/shipping/rates?postal=${encodeURIComponent(postal)}&weight=${weightGrams}`,
      );
      const data = (await res.json()) as { rates: Rate[]; error?: string };
      if (data.error) setError(data.error);
      setRates(data.rates ?? []);
      if (data.rates?.length) setSelected(data.rates[0]);
    } catch {
      setError("Couldn't reach the shipping service.");
    } finally {
      setLoading(false);
    }
  }

  const fee = selected?.price ?? 0;

  return (
    <div className="field">
      <label htmlFor="postal">Postal code</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="input"
          id="postal"
          name="postal"
          inputMode="numeric"
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
          autoComplete="postal-code"
          placeholder="e.g. 12160"
        />
        <button type="button" className="btn-secondary" onClick={calc} disabled={loading || !postal}>
          {loading ? "…" : "Get rates"}
        </button>
      </div>

      {error && (
        <p className="field-hint" style={{ color: "var(--danger, #ef4444)" }}>{error}</p>
      )}

      {rates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {rates.map((r) => (
            <label
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 13,
                color: "var(--body)",
                border: "1px solid var(--hairline)",
                borderRadius: 6,
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="radio"
                  name="shippingRate"
                  checked={selected?.id === r.id}
                  onChange={() => setSelected(r)}
                />
                {r.label}
                {r.eta ? <span style={{ color: "var(--mute)" }}> · {r.eta}</span> : null}
              </span>
              <span className="mono" style={{ color: "var(--ink)" }}>{formatIdr(r.price)}</span>
            </label>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--body)" }}>
          Shipping: <span className="mono">{formatIdr(fee)}</span> · Order total:{" "}
          <span className="mono" style={{ color: "var(--ink)" }}>{formatIdr(cartTotal + fee)}</span>
        </div>
      )}

      {/* Submitted with the checkout form */}
      <input type="hidden" name="shippingFee" value={fee} />
      <input type="hidden" name="shippingLabel" value={selected?.label ?? ""} />
      <input type="hidden" name="shippingRateId" value={selected?.id ?? ""} />
    </div>
  );
}
