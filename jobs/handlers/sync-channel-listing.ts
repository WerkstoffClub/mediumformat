// Push a single ChannelListing to its external channel.
// Routes by channel.type. Most are stubs until each MVP phase implements them.

import { prisma } from "../../lib/db";
import { logger } from "../../lib/logger";
import { discogs } from "../../lib/integrations/discogs/client";

const log = logger.child({ component: "sync-channel-listing" });

export async function syncChannelListing(listingId: string) {
  const listing = await prisma.channelListing.findUnique({
    where: { id: listingId },
    include: {
      channel: true,
      variant: { include: { product: { include: { release: true } } } },
    },
  });
  if (!listing) return;

  try {
    switch (listing.channel.type) {
      case "DISCOGS":
        await syncToDiscogs(listing);
        break;
      case "WEBSITE":
        // Website serves directly from DB; nothing to push.
        break;
      case "TOKOPEDIA":
      case "SHOPEE":
      case "POS":
        log.info(
          { channel: listing.channel.type },
          "sync stubbed; implement per phase",
        );
        break;
    }
    await prisma.channelListing.update({
      where: { id: listingId },
      data: { lastOutboundSyncAt: new Date(), syncError: null },
    });
  } catch (err) {
    await prisma.channelListing.update({
      where: { id: listingId },
      data: { syncError: (err as Error).message, status: "ERROR" },
    });
    throw err;
  }
}

async function syncToDiscogs(
  listing: NonNullable<Awaited<ReturnType<typeof prisma.channelListing.findUnique>>> & {
    variant: { product: { release: { discogsId: number | null } | null } };
  },
) {
  const release = listing.variant.product.release;
  if (!release?.discogsId) {
    throw new Error("Variant's release has no discogsId; cannot list on Discogs");
  }
  // Body shape per Discogs API:
  // https://www.discogs.com/developers#page:marketplace,header:marketplace-listings
  const body = {
    release_id: release.discogsId,
    condition: "Near Mint (NM or M-)", // TODO map MediaCondition enum -> Discogs strings
    sleeve_condition: "Near Mint (NM or M-)",
    price: Number(listing.priceOverrideIdr ?? 0),
    status: listing.status === "FOR_SALE" ? "For Sale" : "Draft",
    comments: listing.commentsText ?? "",
    allow_offers: listing.allowOffers,
    external_id: listing.id,
  };
  if (listing.externalId) {
    await discogs.updateListing(Number(listing.externalId), body);
  } else {
    const res = await discogs.createListing(body);
    await prisma.channelListing.update({
      where: { id: listing.id },
      data: { externalId: String((res as { listing_id: number }).listing_id) },
    });
  }
}
