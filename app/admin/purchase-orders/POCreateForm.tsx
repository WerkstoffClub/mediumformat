"use client";

import { useMemo, useState } from "react";
import { formatIdr } from "@/lib/format";
import { createPurchaseOrder } from "./actions";

type Line = { description: string; qty: number; unit: number };

function parse(text: string): Line[] {
  const out: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const cells = row.split(/[\t,;]/).map((c) => c.trim());
    if (cells.length < 2) continue;
    const num = (s: string) => Number((s ?? "").replace(/[^0-9.]/g, ""));
    let description: string, qty: number, unit: number;
    if (cells.length >= 3) {
      description = cells[0];
      qty = Math.round(num(cells[1])) || 0;
      unit = num(cells[cells.length - 1]);
    } else {
      description = cells[0];
      qty = 1;
      unit = num(cells[1]);
    }
    if (!description || (!qty && !unit)) continue;
    out.push({ description, qty: qty || 1, unit: Number.isFinite(unit) ? unit : 0 });
  }
  return out;
}

export function POCreateForm({
  locations,
  suppliers,
}: {
  locations: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const [text, setText] = useState("");
  const lines = useMemo(() => parse(text), [text]);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit, 0);
  const units = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <form action={createPurchaseOrder} className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-hdr">
        <span className="panel-title">New purchase order</span>
      </div>
      <div className="panel-body">
        <div className="form-row">
          <div className="field">
            <label htmlFor="supplierId">Supplier</label>
            <select className="select" id="supplierId" name="supplierId" defaultValue="">
              <option value="">— none —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="field-hint">
              <a href="/admin/suppliers" className="link" style={{ textDecoration: "underline" }}>
                Manage suppliers
              </a>
            </div>
          </div>
          <div className="field">
            <label htmlFor="locationId">Receive into</label>
            <select className="select" id="locationId" name="locationId" defaultValue={locations[0]?.id ?? ""}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="invoice">Invoice lines</label>
          <textarea
            id="invoice"
            name="invoice"
            className="textarea"
            style={{ minHeight: 130 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Description, Qty, Unit cost (IDR)\nSonic Youth — Goo (LP), 3, 380000\nAphex Twin — SAW II (2xLP), 2, 620000"}
          />
          <div className="field-hint">
            One line per item · columns: description, qty, unit cost (IDR). Commas or tabs.
          </div>
        </div>

        {lines.length > 0 && (
          <div className="panel" style={{ marginBottom: 14 }}>
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
                      <td className="t-right mono t-ink">{formatIdr(l.qty * l.unit)}</td>
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
                <span className="k">Subtotal</span> <span className="v mono">{formatIdr(subtotal)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={lines.length === 0}>
            Create purchase order
          </button>
        </div>
      </div>
    </form>
  );
}
