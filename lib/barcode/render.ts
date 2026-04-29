// Barcode label rendering. Uses bwip-js to produce PNG/SVG buffers we can
// embed in PDF labels (jsPDF) for thermal printers.

import bwipjs from "bwip-js/node";

export async function renderCode128(text: string, opts?: { scale?: number }) {
  return bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: opts?.scale ?? 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });
}

export async function renderEan13(text: string, opts?: { scale?: number }) {
  return bwipjs.toBuffer({
    bcid: "ean13",
    text,
    scale: opts?.scale ?? 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });
}
