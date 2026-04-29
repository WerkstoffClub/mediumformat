// Worker process. Run with: `npm run worker`
// Consumes BullMQ jobs in parallel across queues.
//
// In production this runs as a separate container in docker-compose.

import { Worker } from "bullmq";
import { bullConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import { resolveTracksForRelease } from "./handlers/resolve-tracks";
import { syncChannelListing } from "./handlers/sync-channel-listing";
import { pollDiscogsOrders } from "./handlers/poll-discogs-orders";

const log = logger.child({ component: "worker" });

const workers = [
  new Worker(
    "track-resolve",
    async (job) => {
      log.info({ jobId: job.id, name: job.name }, "track-resolve start");
      await resolveTracksForRelease(job.data.releaseId);
    },
    bullConnection,
  ),
  new Worker(
    "channel-sync",
    async (job) => {
      log.info({ jobId: job.id, name: job.name }, "channel-sync start");
      await syncChannelListing(job.data.listingId);
    },
    bullConnection,
  ),
  new Worker(
    "discogs-sync",
    async (job) => {
      log.info({ jobId: job.id, name: job.name }, "discogs-sync start");
      if (job.name === "poll-orders") await pollDiscogsOrders();
    },
    bullConnection,
  ),
];

for (const w of workers) {
  w.on("completed", (job) =>
    log.info({ queue: w.name, jobId: job.id }, "completed"),
  );
  w.on("failed", (job, err) =>
    log.error({ queue: w.name, jobId: job?.id, err: err.message }, "failed"),
  );
}

log.info("worker process ready");

process.on("SIGTERM", async () => {
  log.info("SIGTERM, closing workers");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});
