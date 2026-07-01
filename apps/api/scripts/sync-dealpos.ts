/**
 * CLI entrypoint for the DealPOS clone: `pnpm --filter @mf/api sync:dealpos [entity]`
 * Loads .env (symlinked to the repo root), runs the sync, prints a summary table.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { DealposClient } from '../src/dealpos/dealpos.client';
import { DealposSyncService, SYNC_ENTITIES, SyncEntity } from '../src/dealpos/dealpos-sync.service';

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*(?:#.*)?$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

async function main() {
  loadEnv();
  const entity = process.argv[2] as SyncEntity | undefined;
  if (entity && !SYNC_ENTITIES.includes(entity)) {
    console.error(`Unknown entity "${entity}". Valid: ${SYNC_ENTITIES.join(', ')}`);
    process.exit(2);
  }
  const prisma = new PrismaService();
  await prisma.$connect();
  const sync = new DealposSyncService(prisma, new DealposClient());
  try {
    const results = await sync.syncAll(entity);
    console.table(results.map(r => ({
      entity: r.entity, status: r.status, upserted: r.upserted, skipped: r.skipped,
      message: r.message?.slice(0, 60) ?? '',
    })));
    process.exitCode = results.some(r => r.status === 'error') ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
