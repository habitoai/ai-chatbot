import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc';

// Create a handler for Next.js API routes
const handler = async (req: Request) => {
  console.log(`[TRPC_HANDLER] Received request: ${req.method} ${req.url}`);
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });
};

export { handler as GET, handler as POST };
