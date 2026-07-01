import openNextWorker, {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from '../.open-next/worker.js';

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge };

/** Must match wrangler.jsonc triggers.crons exactly. */
const SYNC_CRON = '0 */6 * * *';

export default {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    if (controller.cron !== SYNC_CRON) return;

    const secret = env.CRON_SECRET;
    if (!secret) {
      console.error('[cron] CRON_SECRET not configured');
      return;
    }

    try {
      const response = await env.WORKER_SELF_REFERENCE.fetch(
        new Request('https://sebraiers.internal/api/sync', {
          method: 'POST',
          headers: { 'x-cron-secret': secret },
        })
      );

      const body = await response.text();
      if (!response.ok) {
        console.error(`[cron] Sync failed (${response.status}): ${body}`);
        return;
      }

      console.log(`[cron] Sync completed: ${body}`);
    } catch (error) {
      console.error('[cron] Sync request failed:', error);
    }
  },
};
