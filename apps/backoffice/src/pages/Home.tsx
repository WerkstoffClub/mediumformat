import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummary, type FinanceSummary } from '../api/finance';
import { getReleases } from '../api/inventory';
import { fmtIdr } from '../api/ops';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Full-screen landing in the "Players" hero style: groove disc, dark veil,
    10% overlay, left-anchored copy, minimal underline CTA. */
export default function Home() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [stock, setStock] = useState<number | null>(null);

  useEffect(() => {
    const today = isoDay(new Date());
    const monthStart = isoDay(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)));
    getSummary({ from: monthStart, to: today }).then(setSummary).catch(() => {});
    getReleases({ limit: 1 }).then(r => setStock(r.total)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 16 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative h-full min-h-[540px] -m-5 overflow-hidden bg-[#0F0F0F]">
      {/* groove disc artwork */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="w-[640px] h-[640px] max-w-[80vw] max-h-[80vw] rounded-full opacity-55 relative"
          style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #000 0 5px, #191919 5px 10px)' }}
        >
          <div className="absolute rounded-full bg-white opacity-70" style={{ inset: '44%' }} />
        </div>
      </div>
      {/* 10% black overlay over the artwork */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      {/* veil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.15) 40%, rgba(0,0,0,.55) 100%)' }}
      />

      {/* left-anchored content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-[640px] px-[72px] flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded-full border border-white/50 text-white bg-black/25 backdrop-blur">
            <span className="w-[5px] h-[5px] rounded-full bg-current" /> {greeting}
          </span>
          <h1 className="text-[48px] font-semibold tracking-[-0.05em] leading-[1.04] text-white [text-shadow:0_2px_20px_rgba(0,0,0,.35)]">
            Medium Format<br />Back-office
          </h1>
          <p className="text-[14px] text-white/[.78] max-w-[36ch] leading-relaxed">
            {summary
              ? `${fmtIdr(summary.revenue)} this month across ${summary.orders} orders · ${stock ?? '—'} releases in stock.`
              : 'Store overview is loading…'}
          </p>
          <div className="flex items-center gap-7 mt-1">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-white border-b border-white/[.45] pb-2 px-0.5 hover:border-white hover:gap-3 transition-all"
            >
              Open dashboard
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link
              to="/finance"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-white/70 border-b border-transparent pb-2 px-0.5 hover:text-white hover:border-white/[.45] transition-all"
            >
              Finance
            </Link>
            <Link
              to="/inventory"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-white/70 border-b border-transparent pb-2 px-0.5 hover:text-white hover:border-white/[.45] transition-all"
            >
              Inventory
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
