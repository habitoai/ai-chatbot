import { Redis } from '@upstash/redis';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { createClient } from '@supabase/supabase-js';
import superjson from 'superjson';
import type { AppRouter } from '../server/trpc';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Redis client
const redisUrl = process.env.UPSTASH_REDIS_REST_URL!;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN!;
const redis = new Redis({ url: redisUrl, token: redisToken });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize tRPC client
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      transformer: superjson,
    }),
  ],
});

// Test session and message data
const TEST_SESSION_ID = uuidv4();
const TEST_MESSAGE_1_ID = `test-msg-1-${Date.now().toString()}`;
const TEST_MESSAGE_2_ID = `test-msg-2-${Date.now().toString()}`;
const TEST_USER_ID = uuidv4();
const TIMESTAMP_1 = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
const TIMESTAMP_2 = new Date().toISOString(); // now
const TIMESTAMP_1_MS = new Date(TIMESTAMP_1).getTime();
const TIMESTAMP_2_MS = new Date(TIMESTAMP_2).getTime();

async function setupTestData(sessionId: string) {
  console.log('Setting up test data in Redis and Supabase...');

  // Step 1: Ensure a User record exists in Supabase for TEST_USER_ID
  const testUserEmail = `test-user-${TEST_USER_ID.substring(0,8)}@example.com`;
  const testUserPassword = 'password123'; // Dummy password for test user

  try {
    console.log(`Attempting to create or ensure user ${TEST_USER_ID} (${testUserEmail})...`);
    const { data: userCreationData, error: userCreationError } = await supabaseAdmin.auth.admin.createUser({
      id: TEST_USER_ID, // Assign our pre-generated UUID
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true, // Auto-confirm email for testing
    });

    if (userCreationError) {
      // Check if the error indicates the user already exists.
      const errorMessage = userCreationError.message?.toLowerCase() || '';
      const errorStatus = userCreationError.status;

      // Common indicators for "user already exists" or similar conflicts.
      // Adjust these conditions based on actual error responses from Supabase if needed.
      if (errorMessage.includes('user already registered') || 
          errorMessage.includes('already exists') || 
          errorMessage.includes('duplicate key value violates unique constraint') || // For ID conflicts
          (errorStatus && [400, 409, 422].includes(errorStatus))) { 
        console.log(`User ${TEST_USER_ID} (${testUserEmail}) already exists or a similar conflict occurred, proceeding.`);
      } else {
        // A different, unexpected error occurred during user creation
        console.error('Error creating user with supabaseAdmin.auth.admin.createUser:', userCreationError);
        throw userCreationError;
      }
    } else if (userCreationData?.user) {
      console.log('User created successfully:', userCreationData.user.id);
    } else {
      // This case (no error, but no user object) is unusual for createUser.
      // For robustness, attempt to fetch the user by ID to confirm existence as a fallback.
      console.warn('User creation attempt had no error, but no user data was returned. Confirming user existence...');
      const { data: fetchedUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(TEST_USER_ID);
      if (fetchError || !fetchedUser?.user) {
          console.error('Failed to confirm user existence after ambiguous createUser response. Fetch error:', fetchError);
          throw new Error('User creation/confirmation failed.');
      }
      console.log('User confirmed to exist after ambiguous createUser response:', fetchedUser.user.id);
    }
    // If we reach here, the user is considered "ensured".

    // Step 1.5: Ensure a corresponding record exists in the public 'User' table
    console.log(`Ensuring user record in public.User for ${TEST_USER_ID}...`);
    const { data: publicUserData, error: publicUserError } = await supabaseAdmin
      .from('User') // Assuming the table is named 'User' in the public schema
      .upsert(
        {
          id: TEST_USER_ID,
          email: testUserEmail, // Add email to the public.User table upsert
          // Add any other required fields for the User table, e.g., username, email if duplicated
          // For now, we'll assume 'id' is the primary key and potentially the only required field if others have defaults.
        },
        {
          onConflict: 'id', // Upsert based on the 'id' column
        }
      )
      .select();

    if (publicUserError) {
      console.error('Error creating/upserting record in public.User table:', publicUserError);
      throw publicUserError;
    }
    console.log('User record ensured in public.User table:', publicUserData);

  } catch (error: any) { 
    // This outer catch handles errors from the try block, including re-thrown createUserError
    // or errors from the fallback getUserById call.
    // We need to ensure we don't mask the original error if it wasn't an "already exists" type.
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.status;
    if (errorMessage.includes('user already registered') || 
        errorMessage.includes('already exists') || 
        errorMessage.includes('duplicate key value violates unique constraint') ||
        (errorStatus && [400, 409, 422].includes(errorStatus))) {
      console.log(`User ${TEST_USER_ID} (${testUserEmail}) already exists (caught in outer block), proceeding.`);
    } else {
      console.error("Failed to ensure user record in Supabase during setupTestData. Aborting test setup.", error);
      throw error;
    }
  }

  // Step 2: Ensure a Chat record exists in Supabase for this session
  try {
    console.log(`Ensuring chat record for session ${sessionId} and user ${TEST_USER_ID}...`);
    const { data: chatData, error: chatError } = await supabaseAdmin
      .from('Chat')
      .upsert(
        {
          id: sessionId,
          userId: TEST_USER_ID, // This should now find a valid user in 'User' table
          createdAt: new Date().toISOString(),
          title: `Test Chat ${sessionId.substring(0, 8)}`, // Provide a title
        },
        {
          onConflict: 'id',
        }
      )
      .select();

    if (chatError) {
      console.error('Error creating/upserting chat record in Supabase:', chatError);
      throw chatError;
    }
    console.log('Chat record ensured in Supabase:', chatData);
  } catch (error) {
    console.error('Failed to ensure chat record in Supabase. Aborting test setup.');
    throw error;
  }

  // Create message hashes
  const message1Id = uuidv4();
  const message2Id = uuidv4();
  
  await redis.hset(`message:${message1Id}`, {
    sessionID: sessionId,
    userID: TEST_USER_ID,
    senderType: 'user',
    content: JSON.stringify({ text: 'Hello from Redis test message 1!' }),
    timestamp: TIMESTAMP_1,
  });
  
  await redis.hset(`message:${message2Id}`, {
    sessionID: sessionId,
    userID: TEST_USER_ID,
    senderType: 'ai',
    content: JSON.stringify({ text: 'Hello from Redis test message 2!' }),
    timestamp: TIMESTAMP_2,
  });
  
  // Add messages to the session's sorted set
  await redis.zadd(
    `session:${sessionId}:messages`,
    { score: TIMESTAMP_1_MS, member: message1Id },
    { score: TIMESTAMP_2_MS, member: message2Id }
  );
  
  // Reset the sync timestamp to ensure we sync all messages
  await redis.hset(`syncState:session:${sessionId}`, {
    lastSupabaseSyncTimestamp: 0,
  });
  
  console.log('Test data setup complete.');
  console.log(`Test Session ID: ${sessionId}`);
  console.log(`Test Message 1 ID: ${message1Id} (${TIMESTAMP_1})`);
  console.log(`Test Message 2 ID: ${message2Id} (${TIMESTAMP_2})`);
  return { sessionId, message1Id, message2Id };
}

async function verifySupabaseData(message1Id: string, message2Id: string) {
  console.log('\nVerifying data in Supabase...');
  
  // Query Supabase for the synced messages
  const { data, error } = await supabase
    .from('Message')
    .select('*')
    .eq('chatId', TEST_SESSION_ID);
  
  if (error) {
    console.error('Error querying Supabase:', error);
    return false;
  }
  
  console.log(`Found ${data?.length || 0} messages in Supabase for session ${TEST_SESSION_ID}`);
  
  if (data && data.length > 0) {
    console.log('Messages in Supabase:');
    data.forEach(message => {
      console.log(`- ID: ${message.id}, Role: ${message.role}, Created: ${message.createdAt}`);
      console.log(`  Content: ${JSON.stringify(message.content)}`);
    });
    
    // Check if the specific test messages are present
    const message1InSupabase = data?.find(m => m.id === message1Id);
    const message2InSupabase = data?.find(m => m.id === message2Id);

    const message1Found = !!message1InSupabase;
    const message2Found = !!message2InSupabase;

    if (message1Found) {
      console.log(`✅ Verification: Message 1 (${message1Id}) FOUND in Supabase.`);
    } else {
      console.log(`❌ Verification: Message 1 (${message1Id}) NOT FOUND in Supabase.`);
    }

    if (message2Found) {
      console.log(`✅ Verification: Message 2 (${message2Id}) FOUND in Supabase.`);
    } else {
      console.log(`❌ Verification: Message 2 (${message2Id}) NOT FOUND in Supabase.`);
    }
    
    const allMessagesSyncedCorrectly = message1Found && message2Found;

    return allMessagesSyncedCorrectly;
  } else {
    console.log('❌ No messages found in Supabase.');
    return false;
  }
}

async function verifyRedisState() {
  console.log('\nVerifying Redis sync state...');
  
  const lastSyncTimestamp = await redis.hget(`syncState:session:${TEST_SESSION_ID}`, 'lastSupabaseSyncTimestamp');
  
  if (lastSyncTimestamp) {
    const lastSyncDate = new Date(Number(lastSyncTimestamp)).toISOString();
    console.log(`Last sync timestamp for session ${TEST_SESSION_ID}: ${lastSyncDate}`);
    
    // Check if the last sync timestamp is close to our latest message timestamp
    const lastSyncMs = Number(lastSyncTimestamp);
    const diffMs = Math.abs(lastSyncMs - TIMESTAMP_2_MS);
    
    let lastSyncTimestampUpdated = false;
    if (diffMs < 1000) { // Within 1 second
      console.log(`✅ Last sync timestamp is correctly updated!`);
      lastSyncTimestampUpdated = true;
    } else {
      console.log(`❌ Last sync timestamp mismatch. Expected: ${TIMESTAMP_2_MS}, Got: ${lastSyncMs}`);
    }

    return lastSyncTimestampUpdated;
  } else {
    console.log('❌ No last sync timestamp found in Redis.');
    return false;
  }
}

async function cleanupTestData() {
  console.log('\nCleaning up test data...');
  
  // Delete Redis keys
  await redis.del(`message:${TEST_MESSAGE_1_ID}`);
  await redis.del(`message:${TEST_MESSAGE_2_ID}`);
  await redis.del(`session:${TEST_SESSION_ID}:messages`);
  await redis.del(`syncState:session:${TEST_SESSION_ID}`);
  
  // Delete Supabase data
  const { error } = await supabase
    .from('Message')
    .delete()
    .eq('chatId', TEST_SESSION_ID);
  
  if (error) {
    console.error('Error deleting from Supabase:', error);
  } else {
    console.log('Test data cleanup complete.');
  }
}

async function runTest() {
  try {
    // Step 1: Set up test data in Redis
    const { sessionId, message1Id, message2Id } = await setupTestData(TEST_SESSION_ID);
    
    // Step 2: Call the tRPC endpoint to sync messages
    console.log('\nCalling tRPC syncSessionMessagesToSupabase...');
    console.log('tRPC endpoint URL: http://localhost:3001/api/trpc');
    console.log('Request payload:', { sessionId });
    
    try {
      const result = await trpc.sync.syncSessionMessagesToSupabase.mutate({
        sessionId,
      });
      
      console.log('tRPC call completed successfully');
      console.log('Sync result:', result);
      
      // Step 3: Verify the results
      const supabaseVerified = await verifySupabaseData(message1Id, message2Id);
      const redisStateVerified = await verifyRedisState();
      
      if (supabaseVerified && redisStateVerified) {
        console.log('\n✅ TEST PASSED: Redis-to-Supabase sync successful!');
      } else {
        console.error('\n❌ TEST FAILED: Issues with Redis-to-Supabase sync.');
        if (!supabaseVerified) {
          console.error('  Reason: Not all messages were found in Supabase as expected during verification.');
        }
        if (!redisStateVerified) {
          console.error('  Reason: Last sync timestamp in Redis was not updated correctly.');
        }
        process.exit(1);
      }
      
      // Step 4: Clean up test data (optional, comment out to keep data for inspection)
      // await cleanupTestData();
      
    } catch (error) {
      console.error('Error calling tRPC endpoint:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
runTest();
