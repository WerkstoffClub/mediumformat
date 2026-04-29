// Polls Discogs Marketplace orders every 2 min. Inserts new orders, reserves
// stock, opens a message thread for buyer ↔ shop comms.

import { prisma } from "../../lib/db";
import { logger } from "../../lib/logger";
import { discogs } from "../../lib/integrations/discogs/client";

const log = logger.child({ component: "poll-discogs-orders" });

export async function pollDiscogsOrders() {
  const channel = await prisma.channel.findFirst({ where: { type: "DISCOGS" } });
  if (!channel?.enabled) return;

  try {
    const data = (await discogs.listOrders()) as {
      orders: Array<{ id: string; status: string; total: { value: number } }>;
    };
    log.info({ count: data.orders?.length ?? 0 }, "discogs orders fetched");
    // TODO: upsert into Order/OrderItem, reserve stock atomically,
    //       create MessageThread per order. Implemented in MVP-2.
  } catch (err) {
    log.error({ err: (err as Error).message }, "poll failed");
  }
}
