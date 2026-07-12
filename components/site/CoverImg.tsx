"use client";

import { useState } from "react";

// Renders a cover image, falling back to the vinyl-groove placeholder when the
// source is missing or fails to load (fixes broken/missing release artwork in
// both the storefront and the back-office). Works inside `.mf` and `.mfa`.
export function CoverImg({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="cover-art">
        <span className="grooves" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  );
}
