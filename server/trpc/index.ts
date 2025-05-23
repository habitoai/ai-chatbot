import { router } from './trpc';
import { syncerRouter } from './routers/syncer';

// Create the main app router by combining all sub-routers
export const appRouter = router({
  sync: syncerRouter,
  // Add other routers here as needed
});

// Export type definition of the API
export type AppRouter = typeof appRouter;
