"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Search button + ⌘K overlay, ported from the prototype. Submitting navigates
// to /shop?q=… (the shop page reads `q` and filters by title).
export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) {
      router.push(`/shop?q=${encodeURIComponent(term)}`);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="nav-btn"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      <div
        className={`mf-search-ov${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="sbox">
          <form className="srow" onSubmit={submit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="sinput"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search artist, title, label…"
              autoFocus
            />
          </form>
          <div className="shint">
            Press <span className="kbd">Esc</span> to close
          </div>
        </div>
      </div>
    </>
  );
}
