/** Pure pricing computations for the imports pricing engine.
 *  No DI, no I/O — safe to unit test in isolation. */

export interface ChannelPricingCfgLike {
  feePct: number;
  rounding: string;
  currency: string;
}

/** Target margin applied on top of landed cost before channel fees are
 *  grossed up, e.g. 1.2 => landed cost is marked up 220% (2.2x) before fees. */
export const DEFAULT_TARGET_MARKUP = Number(process.env.PRICING_TARGET_MARKUP ?? 1.2);

/** Rounds a price up to the channel's display convention.
 *  IDR NEAREST_1000: ceil to the next 1,000.
 *  IDR X900: ceil to the next 1,000 minus 100 (e.g. ...900 price points).
 *  Any non-IDR currency: ceil up to the next 0.5. */
export function roundPrice(value: number, rounding: string, currency: string): number {
  if (currency === 'IDR') {
    if (rounding === 'X900') {
      return Math.ceil(value / 1000) * 1000 - 100;
    }
    // NEAREST_1000 (default)
    return Math.ceil(value / 1000) * 1000;
  }
  // USD (or any other non-IDR currency): round up to the nearest 0.5
  return Math.ceil(value * 2) / 2;
}

/** Splits `totalIdr` across lines proportional to `weights`. If every weight
 *  is 0, splits evenly instead. Rounds each share to a whole rupiah and
 *  assigns any leftover remainder to the line with the largest weight (or
 *  the first line, when weights are all zero) so the sum always equals
 *  `totalIdr` exactly. */
export function allocateByWeight(weights: number[], totalIdr: number): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const shares = totalWeight > 0
    ? weights.map(w => w / totalWeight)
    : weights.map(() => 1 / n);

  const rounded = shares.map(share => Math.round(totalIdr * share));
  const allocated = rounded.reduce((sum, v) => sum + v, 0);
  const remainder = totalIdr - allocated;

  if (remainder !== 0) {
    let largestIdx = 0;
    for (let i = 1; i < n; i++) {
      if (weights[i] > weights[largestIdx]) largestIdx = i;
    }
    rounded[largestIdx] += remainder;
  }

  return rounded;
}

/** Per-unit landed cost in IDR: converted unit price plus this line's share
 *  of vendor shipping and forwarder costs, spread across its quantity. */
export function landedCostPerUnitIdr(
  unitPriceNative: number,
  fxRate: number,
  allocatedVendorShipIdr: number,
  allocatedForwarderIdr: number,
  qty: number,
): number {
  const convertedUnitCost = unitPriceNative * fxRate;
  const sharedCostPerUnit = qty > 0 ? (allocatedVendorShipIdr + allocatedForwarderIdr) / qty : 0;
  return convertedUnitCost + sharedCostPerUnit;
}

/** Computes a channel list price: apply target markup to landed cost,
 *  convert to the channel's currency if needed, gross up for the channel's
 *  fee, then round to the channel's display convention. */
export function channelPrice(
  landedCostIdr: number,
  cfg: ChannelPricingCfgLike,
  targetMarkup: number,
  usdIdrRate: number,
): number {
  let baseNet = landedCostIdr * (1 + targetMarkup);
  if (cfg.currency !== 'IDR') {
    baseNet = baseNet / usdIdrRate;
  }
  const gross = baseNet / (1 - cfg.feePct);
  return roundPrice(gross, cfg.rounding, cfg.currency);
}
