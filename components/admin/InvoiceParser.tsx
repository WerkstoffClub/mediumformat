"use client";

import { useMemo, useState } from "react";
import { formatIdr } from "@/lib/format";

type Line = { description: string; qty: number; unit: number; total: number };

// Parse pasted invoice text into line items. Accepts comma- or tab-separated
// rows: "description, qty, unit price" (or "description, unit price" → qty 1).
// Header rows (non-numeric qty & price) are skipped.
function parse(text: string): Line[] {
  const lines: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const cells = row.split(/[\t,;]/).map((c) => c.trim());
    if (cells.length < 2) continue;

    const num = (s: string) => Number((s ?? "").replace(/[^0-9.]/g, ""));
    let description: string;
    let qty: number;
    let unit: number;

    if (cells.length >= 3) {
      description = cells[0];
      qty = Math.round(num(cells[1])) || 0;
      unit = num(cells[cells.length - 1]);
    } else {
      description = cells[0];
      qty = 1;
      unit = num(cells[1]);
    }

    if (!description || (!qty && !unit)) continue; // likely a header
    if (!qty) qty = 1;
    if (!Number.isFinite(unit)) unit = 0;
    lines.push({ description, qty, unit, total: qty * unit });
  }
  return lines;
}

export function InvoiceParser() {
  const [text, setText] = useState("");
  const lines = useMemo(() => parse(text), [text]);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const units = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div>
      <div className="po-drop" style={{ marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="invoice">Paste invoice lines</label>
          <textarea
            id="invoice"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Description, Qty, Unit price\nSonic Youth — Goo (LP), 3, 450000\nAphex Twin — SAW II (2xLP), 2, 680000"}
          />
          <div className="field-hint">
            One line per item · columns: description, qty, unit price (IDR). Commas or tabs.
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <span className="panel-title">Lines · {lines.length}</span>
        </div>
        {lines.length === 0 ? (
          <div className="panel-body">
            <p className="cell-sub">Paste an invoice above to populate the lines.</p>
          </div>
        ) : (
          <>
            <div className="atable-wrap">
              <table className="atable">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="t-right">Qty</th>
                    <th className="t-right">Unit</th>
                    <th className="t-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="t-ink">{l.description}</td>
                      <td className="t-right mono">{l.qty}</td>
                      <td className="t-right mono">{formatIdr(l.unit)}</td>
                      <td className="t-right mono t-ink">{formatIdr(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="po-tot">
              <div>
                <span className="k">Units</span> <span className="v mono">{units}</span>
              </div>
              <div>
                <span className="k">Subtotal</span>{" "}
                <span className="v mono">{formatIdr(subtotal)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
