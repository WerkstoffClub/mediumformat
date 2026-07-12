"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Faithful port of the prototype's IDR/USD switch: converts rendered IDR prices
// in place (client-side) and remembers the choice. Re-applies after client
// navigation so the preference sticks across pages.
const FX = 16000;
const SEL = [
  ".rprice",
  ".rd-price",
  ".rd-variant-price",
  ".cl-price",
  ".hci-price",
  ".sum-total span:last-child",
  ".sum-row span:last-child",
].join(",");

function apply(cur: string) {
  const fmtUSD = (v: number) => "$" + Math.round(v / FX).toLocaleString("en-US");
  document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
    if (el.children.length) return;
    const t = el.textContent?.trim() ?? "";
    if (cur === "USD") {
      const m = t.match(/^IDR\s([\d,]+)$/);
      if (m) {
        if (!el.dataset.idr) el.dataset.idr = el.textContent ?? "";
        el.textContent = fmtUSD(Number(m[1].replace(/,/g, "")));
      }
    } else if (el.dataset.idr) {
      el.textContent = el.dataset.idr;
    }
  });
}

export function CurrencySwitch() {
  const [cur, setCur] = useState("IDR");
  const pathname = usePathname();

  useEffect(() => {
    const saved =
      (typeof localStorage !== "undefined" && localStorage.getItem("mf-cur")) ||
      "IDR";
    setCur(saved);
  }, []);

  useEffect(() => {
    apply(cur);
  }, [cur, pathname]);

  const choose = (c: string) => {
    if (typeof localStorage !== "undefined") localStorage.setItem("mf-cur", c);
    setCur(c);
  };

  return (
    <div className="cur-switch" role="group" aria-label="Currency">
      <button
        type="button"
        className={`cur-btn${cur === "IDR" ? " on" : ""}`}
        onClick={() => choose("IDR")}
      >
        IDR
      </button>
      <button
        type="button"
        className={`cur-btn${cur === "USD" ? " on" : ""}`}
        onClick={() => choose("USD")}
      >
        USD
      </button>
    </div>
  );
}
