import { z } from 'zod';
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';
import { publicProcedure, router } from '../trpc'; // Assuming your tRPC setup

// Initialize Upstash Redis Client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Initialize Supabase Client
// Ensure these are set in your .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // It's generally recommended to set persistSession to false for server-side operations
    // if you are not managing user sessions with this client instance.
    persistSession: false,
    // Supabase client detects if it's server-side and might disable auto-refresh by default.
    // Explicitly setting it can be good for clarity.
    autoRefreshToken: false 
  }
});

// Placeholder for where the syncer might store/retrieve the last sync timestamp per session
// For MVP, this could be a simple in-memory store, a Redis hash, or a dedicated Supabase table.
// Example: async function getLastSyncTimestamp(sessionId: string): Promise<number | null>
async function getLastSyncTimestamp(sessionId: string): Promise<number> {
  console.log(`[Syncer] Getting last sync timestamp for session: ${sessionId}`);
  // MVP: For now, let's assume we fetch this from a Redis hash
  // Or, for a very first run, return 0 to sync all messages.
  const timestamp = await redis.hget(`syncState:session:${sessionId}`, 'lastSupabaseSyncTimestamp');
  const parsedTimestamp = timestamp ? Number(timestamp) : 0;
  console.log(`[Syncer] Retrieved last sync timestamp for session ${sessionId}: ${parsedTimestamp}`);
  return parsedTimestamp;
}

async function updateLastSyncTimestamp(sessionId: string, timestamp: number): Promise<void> {
  console.log(`[Syncer] Updating last sync timestamp for session ${sessionId} to: ${timestamp}`);
  // MVP: Update the timestamp in the Redis hash
  await redis.hset(`syncState:session:${sessionId}`, { lastSupabaseSyncTimestamp: timestamp });
  console.log(`[Syncer] Successfully updated last sync timestamp for session ${sessionId}`);
}

// Define the expected structure of a message from Redis (adjust as per your actual hash fields)
interface RedisMessage {
  messageID?: string; // Assuming messageID might be part of the hash or derived from key
  sessionID: string;
  userID: string;
  senderType: 'user' | 'ai';
  content: string; // This might be a JSON string if it contains complex objects
  timestamp: string; // ISO 8601 timestamp string
  attachmentsJSON?: string;
  // Add other fields from your message hash
}

// Internal function to sync messages for a single session
async function _syncSingleSession(sessionId: string): Promise<{ success: boolean; message: string; messagesSynced: number; error?: string }> {
  console.log(`[_syncSingleSession] Starting sync for session: ${sessionId}`);
  let messagesSyncedCount = 0;
  let latestMessageTimestampProcessed = 0;

  try {
    const lastSyncTimestampMs = await getLastSyncTimestamp(sessionId);
    console.log(`[_syncSingleSession] Last sync timestamp for session ${sessionId}: ${new Date(lastSyncTimestampMs).toISOString()}`);

    // 1. Fetch new message IDs from Redis Sorted Set
    console.log(`[_syncSingleSession] Fetching message IDs from Redis for session ${sessionId} since timestamp ${lastSyncTimestampMs}`);
    const messageMembersAndScores = await redis.zrange(`session:${sessionId}:messages`, lastSyncTimestampMs, '+inf', { byScore: true, withScores: true, offset: 0, count: 100 });

    console.log(`[_syncSingleSession] Found ${messageMembersAndScores.length / 2} potential new message(s) to sync for session ${sessionId}`);

    if (!messageMembersAndScores || messageMembersAndScores.length === 0) {
      console.log(`[_syncSingleSession] No new messages to sync for session: ${sessionId}`);
      return { success: true, message: 'No new messages to sync.', messagesSynced: 0 };
    }

    const messageIds: string[] = [];
    const scores: number[] = [];
    for (let i = 0; i < messageMembersAndScores.length; i++) {
      if (i % 2 === 0) { messageIds.push(messageMembersAndScores[i] as string); }
      else { scores.push(messageMembersAndScores[i] as number); }
    }
    
    if (messageIds.length === 0) {
        console.log(`[_syncSingleSession] No new message IDs after processing for session: ${sessionId}`);
        return { success: true, message: 'No new messages to sync.', messagesSynced: 0 };
    }

    console.log(`[_syncSingleSession] Message IDs to fetch details for: ${messageIds.join(', ')}`);

    // 2. Fetch full message details from Redis Hashes
    const pipeline = redis.pipeline();
    messageIds.forEach(messageId => pipeline.hgetall(`message:${messageId}`));
    console.log(`[_syncSingleSession] Executing Redis pipeline to fetch ${messageIds.length} message details.`);
    const messageHashesResults = await pipeline.exec<Array<Record<string, string> | null>>();
    console.log(`[_syncSingleSession] Fetched ${messageHashesResults.length} message details from Redis.`);

    const messagesToSync: any[] = [];
    for (let i = 0; i < messageHashesResults.length; i++) {
      const hash = messageHashesResults[i];
      const messageId = messageIds[i];
      const messageTimestamp = scores[i];

      if (hash) {
        const redisMessage = hash as unknown as RedisMessage;
        try {
          let parsedContent: any;
          if (typeof redisMessage.content === 'string') {
            try { parsedContent = JSON.parse(redisMessage.content || '{}'); }
            catch (e) { 
              console.error(`[_syncSingleSession] Error parsing content string for message ${messageId} in session ${sessionId}:`, e);
              continue; 
            }
          } else if (typeof redisMessage.content === 'object' && redisMessage.content !== null) {
            parsedContent = redisMessage.content;
          } else {
            console.warn(`[_syncSingleSession] Unexpected content type for message ${messageId} in session ${sessionId}. Using default.`);
            parsedContent = {};
          }

          const supabaseMessage = {
            id: messageId,
            chatId: redisMessage.sessionID,
            role: redisMessage.senderType,
            content: parsedContent, 
            createdAt: new Date(redisMessage.timestamp),
          };
          messagesToSync.push(supabaseMessage);
          if (messageTimestamp > latestMessageTimestampProcessed) {
            latestMessageTimestampProcessed = messageTimestamp;
          }
        } catch (parseError) {
          console.error(`[_syncSingleSession] Error processing message ${messageId} in session ${sessionId}:`, parseError);
        }
      } else {
        console.warn(`[_syncSingleSession] Could not find message details for ID: ${messageId} in session ${sessionId}`);
      }
    }

    if (messagesToSync.length > 0) {
      console.log(`[_syncSingleSession] Upserting ${messagesToSync.length} messages to Supabase for session ${sessionId}.`);
      const { error } = await supabase
        .from('Message')
        .upsert(messagesToSync, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error('[_syncSingleSession] Supabase error during upsert for session', sessionId, ':', error);
        return { success: false, message: 'Error syncing messages to Supabase.', error: error.message, messagesSynced: 0 };
      } else {
        messagesSyncedCount = messagesToSync.length;
        console.log(`[_syncSingleSession] Successfully synced ${messagesSyncedCount} messages to Supabase for session ${sessionId}. New lastSyncTimestampMs: ${latestMessageTimestampProcessed}.`);
      }
    }

    if (messagesSyncedCount > 0 && latestMessageTimestampProcessed > lastSyncTimestampMs) {
      await updateLastSyncTimestamp(sessionId, latestMessageTimestampProcessed);
    }

    console.log(`[_syncSingleSession] Sync completed for session ${sessionId}. Synced ${messagesSyncedCount} messages.`);
    return { 
        success: true, 
        message: `Sync completed for session ${sessionId}. Synced ${messagesSyncedCount} messages.`, 
        messagesSynced: messagesSyncedCount 
    };
  } catch (error: any) {
    console.error(`[_syncSingleSession] Unexpected error during sync for session ${sessionId}:`, error);
    return { 
        success: false, 
        message: `Unexpected error during sync for session ${sessionId}.`, 
        error: error.message || 'Unknown error',
        messagesSynced: 0 
    };
  }
}

export const syncerRouter = router({
  syncSessionMessagesToSupabase: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const { sessionId } = input;
      console.log(`[SyncerRoute] Received request to sync messages for session: ${sessionId}`);
      return await _syncSingleSession(sessionId);
    }),

  triggerGlobalMessageSync: publicProcedure
    .mutation(async () => {
      console.log('[GlobalSyncer] Received request to trigger global message sync.');
      let sessionsProcessed = 0;
      let totalMessagesSynced = 0;
      const failedSessions: Array<{ sessionId: string; error: string }> = [];

      try {
        // Use scan to find all session message keys
        // Adjust the pattern if your session message keys are different
        console.log('[GlobalSyncer] Starting Redis scan for session message keys...');
        let cursor: string | number = 0; // Start cursor at 0 for the first scan call
        let currentKeys: string[];

        do {
          // Casting to 'any' to bypass TS error if type definitions are lagging for scan, 
          // or if the specific overload isn't perfectly matched by TS.
          // The Upstash SDK docs show `redis.scan(cursor, { options })` as valid.
          [cursor, currentKeys] = await (redis as any).scan(cursor, { match: 'session:*:messages', count: 100 });
          console.log(`[GlobalSyncer] Scan returned cursor: ${cursor}, Keys found: ${currentKeys.length}`);

          for (const key of currentKeys) {
            // Extract sessionId from the key. Example: 'session:uuid-goes-here:messages'
            const parts = key.split(':');
            if (parts.length === 3 && parts[0] === 'session' && parts[2] === 'messages') {
              const potentialSessionId = parts[1];
              
              // Validate if potentialSessionId is a UUID
              const uuidValidation = z.string().uuid().safeParse(potentialSessionId);
              if (!uuidValidation.success) {
                console.warn(`[GlobalSyncer] Found key with non-UUID session identifier: ${key}. Skipping.`);
                failedSessions.push({ sessionId: potentialSessionId, error: 'Invalid session ID format (not a UUID)' });
                sessionsProcessed++; // Still count as processed for scanning purposes
                continue;
              }
              const sessionId = uuidValidation.data; // Now we know it's a valid UUID

              console.log(`[GlobalSyncer] Found session to sync: ${sessionId}`);
              sessionsProcessed++;
              
              const result = await _syncSingleSession(sessionId);
              if (result.success) {
                totalMessagesSynced += result.messagesSynced;
              } else {
                failedSessions.push({ sessionId, error: result.error || 'Unknown sync error' });
                console.error(`[GlobalSyncer] Failed to sync session ${sessionId}: ${result.message}`);
              }
            } else {
              console.warn(`[GlobalSyncer] Found a key that does not match expected session pattern: ${key}`);
            }
          }
        } while (cursor !== '0' && cursor !== 0); // Loop until cursor is '0' (string or number)

        console.log(`[GlobalSyncer] Global sync scan complete. Processed ${sessionsProcessed} potential sessions.`);
        const summary = {
          sessionsProcessed,
          totalMessagesSynced,
          failedSessionsCount: failedSessions.length,
          failedSessions,
        };
        console.log('[GlobalSyncer] Global sync summary:', summary);
        return {
          success: true,
          message: `Global sync process completed. Checked ${sessionsProcessed} sessions.`,
          summary,
        };

      } catch (error: any) {
        console.error('[GlobalSyncer] Critical error during global message sync trigger:', error);
        return {
          success: false,
          message: 'Critical error during global message sync execution.',
          error: error.message || 'Unknown critical error',
        };
      }
    }),
});

// You'll need to merge this router into your main appRouter
// Example in server/trpc/index.ts or similar:
// import { syncerRouter } from './routers/syncer';
// export const appRouter = router({
//   sync: syncerRouter,
//   // ...other routers
// });
// export type AppRouter = typeof appRouter;
