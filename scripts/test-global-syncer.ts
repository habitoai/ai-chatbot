import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc'; // Adjust path if necessary
import fetch from 'node-fetch'; // Required for tRPC client in Node.js
import superjson from 'superjson'; // Import superjson

// Polyfill for fetch if running in a Node.js environment that doesn't have it globally
if (typeof global.fetch === 'undefined') {
  (global as any).fetch = fetch;
}

const trpcUrl = 'http://localhost:3001/api/trpc'; // Make sure this matches your tRPC endpoint URL

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: trpcUrl,
      transformer: superjson, // Add superjson transformer
    }),
  ],
});

async function main() {
  console.log('Calling triggerGlobalMessageSync tRPC procedure...');

  try {
    const result = await client.sync.triggerGlobalMessageSync.mutate(); // Corrected: Added .sync namespace
    console.log('tRPC call completed.');
    console.log('Response from triggerGlobalMessageSync:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Global Sync Test: SUCCESS');
      console.log(`Sessions Processed: ${result.summary?.sessionsProcessed}`);
      console.log(`Total Messages Synced: ${result.summary?.totalMessagesSynced}`);
      if (result.summary?.failedSessionsCount && result.summary.failedSessionsCount > 0) {
        console.warn(`⚠️ Failed Sessions: ${result.summary.failedSessionsCount}`);
        console.warn('Failed session details:', result.summary.failedSessions);
      }
    } else {
      console.error('\n❌ Global Sync Test: FAILED');
      console.error('Error:', result.message);
      if (result.error) {
        console.error('Details:', result.error);
      }
    }

  } catch (error) {
    console.error('❌ Error calling triggerGlobalMessageSync:', error);
  }
}

main().catch(console.error);
