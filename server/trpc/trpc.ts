import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

// Create a new instance of tRPC
const t = initTRPC.create({
  transformer: superjson,
});

// Export the tRPC router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
