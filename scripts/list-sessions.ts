import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function listSessions() {
  try {
    console.log('Searching for session keys in Redis...');
    
    // Use the SCAN command to find keys that match the session pattern
    // This is a more efficient way to search for keys in Redis
    const sessionKeys = await redis.scan(0, {
      match: 'session:*:messages',
      count: 100
    });
    
    if (sessionKeys && sessionKeys.keys && sessionKeys.keys.length > 0) {
      console.log(`Found ${sessionKeys.keys.length} session(s) in Redis:`);
      
      for (const key of sessionKeys.keys) {
        // Extract session ID from the key (format: session:<sessionId>:messages)
        const sessionId = key.split(':')[1];
        
        // Get the number of messages in this session
        const messageCount = await redis.zcard(`session:${sessionId}:messages`);
        
        console.log(`- Session ID: ${sessionId}`);
        console.log(`  Message count: ${messageCount}`);
        
        // Get a sample message ID from this session
        if (messageCount > 0) {
          const sampleMessageIds = await redis.zrange(`session:${sessionId}:messages`, 0, 0);
          if (sampleMessageIds && sampleMessageIds.length > 0) {
            const sampleMessageId = sampleMessageIds[0];
            console.log(`  Sample message ID: ${sampleMessageId}`);
            
            // Get the message details
            const messageDetails = await redis.hgetall(`message:${sampleMessageId}`);
            if (messageDetails) {
              console.log(`  Sample message details: ${JSON.stringify(messageDetails, null, 2)}`);
            }
          }
        }
        
        console.log('---');
      }
    } else {
      console.log('No session keys found in Redis.');
    }
  } catch (error) {
    console.error('Error listing sessions:', error);
  }
}

// Run the function
listSessions();
