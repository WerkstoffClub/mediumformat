// BullMQ queue declarations. The web app enqueues; the worker process consumes.

import { Queue } from "bullmq";
import { bullConnection } from "@/lib/redis";

export const queues = {
  discogsSync: new Queue("discogs-sync", bullConnection),
  channelSync: new Queue("channel-sync", bullConnection),
  trackResolve: new Queue("track-resolve", bullConnection),
  newsletter: new Queue("newsletter", bullConnection),
  reconcile: new Queue("reconcile", bullConnection),
} as const;

export type QueueName = keyof typeof queues;
