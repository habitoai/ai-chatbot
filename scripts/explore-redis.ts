import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function exploreRedis() {
  try {
    console.log('Exploring Redis database structure...');
    
    // Use SCAN to get all keys (or a sample if there are many)
    const allKeys = await redis.scan(0, { count: 100 });
    
    if (allKeys && allKeys.keys && allKeys.keys.length > 0) {
      console.log(`Found ${allKeys.keys.length} key(s) in Redis:`);
      
      // Group keys by prefix for better organization
      const keysByPrefix: Record<string, string[]> = {};
      
      for (const key of allKeys.keys) {
        const parts = key.split(':');
        const prefix = parts[0];
        
        if (!keysByPrefix[prefix]) {
          keysByPrefix[prefix] = [];
        }
        
        keysByPrefix[prefix].push(key);
      }
      
      // Display keys by prefix
      for (const [prefix, keys] of Object.entries(keysByPrefix)) {
        console.log(`\nPrefix: ${prefix} (${keys.length} keys)`);
        
        // Show a sample of keys for each prefix
        const sampleSize = Math.min(5, keys.length);
        console.log(`Sample ${sampleSize} of ${keys.length} keys:`);
        
        for (let i = 0; i < sampleSize; i++) {
          const key = keys[i];
          console.log(`- ${key}`);
          
          // Try to determine the key type
          const keyType = await redis.type(key);
          console.log(`  Type: ${keyType}`);
          
          // Show a preview of the data based on its type
          if (keyType === 'string') {
            const value = await redis.get(key);
            console.log(`  Value: ${typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value).substring(0, 100)}${typeof value === 'string' && value.length > 100 ? '...' : ''}`);
          } else if (keyType === 'hash') {
            const hash = await redis.hgetall(key);
            console.log(`  Hash fields: ${Object.keys(hash || {}).join(', ')}`);
            console.log(`  Sample value: ${JSON.stringify(hash).substring(0, 100)}...`);
          } else if (keyType === 'list') {
            const listLength = await redis.llen(key);
            const sample = await redis.lrange(key, 0, 2);
            console.log(`  List length: ${listLength}`);
            console.log(`  Sample items: ${JSON.stringify(sample)}`);
          } else if (keyType === 'set') {
            const setSize = await redis.scard(key);
            const sample = await redis.smembers(key);
            console.log(`  Set size: ${setSize}`);
            console.log(`  Sample members: ${JSON.stringify(sample).substring(0, 100)}...`);
          } else if (keyType === 'zset') {
            const zsetSize = await redis.zcard(key);
            const sample = await redis.zrange(key, 0, 2, { withScores: true });
            console.log(`  Sorted Set size: ${zsetSize}`);
            console.log(`  Sample members with scores: ${JSON.stringify(sample).substring(0, 100)}...`);
          }
        }
        
        if (keys.length > sampleSize) {
          console.log(`  ... and ${keys.length - sampleSize} more keys with this prefix`);
        }
      }
    } else {
      console.log('No keys found in Redis database.');
    }
  } catch (error) {
    console.error('Error exploring Redis:', error);
  }
}

// Run the function
exploreRedis();
