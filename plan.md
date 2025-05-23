# Implementation Plan: Supabase Integration for Long-Term Memory & Archival Sync

## 1. Overview

This plan outlines the steps to integrate Supabase (PostgreSQL) into the NexusChat architecture as a long-term, durable storage solution for chat sessions and messages. This complements the existing local-first (Dexie.js) and real-time/active data (Upstash Redis) layers.

**Parent PRD:** "NexusChat" - AI-Powered Conversational Platform (Local-First & Redis Edition) v3.0
**Addendum Version:** 3.1 (Supabase Long-Term Store Addon)

## 2. Goals

*   **Data Durability & Backup:** Provide a robust, relational backup of all chat data.
*   **Archival & Cold Storage:** Allow older/less frequently accessed chat data to be offloaded from Redis (optional) while remaining accessible from Supabase.
*   **Complex Queries & Analytics:** Enable SQL-based data analysis, reporting, or search on chat data.
*   **Data Recovery:** Serve as a definitive source of truth for restoring data.
*   **Future Relational Needs:** Offer a relational backend for future features.

## 3. Architectural Changes & Data Flow

### 3.1. Tri-Layer Data Architecture Confirmation
1.  **Client (Dexie.js - IndexedDB):** Local-first experience, offline access.
2.  **Active Server (Upstash Redis):** Real-time synchronization, active/recent chat data.
3.  **Archival Server (Supabase - PostgreSQL):** Long-term, durable relational store.

### 3.2. Data Synchronization: Redis to Supabase (Primary Archival Path)

*   **S-LTS2.2.1. Develop Redis-to-Supabase Syncer Process:**
    *   **Objective:** Asynchronously transfer new/updated data from Redis to Supabase PostgreSQL. - `[x]`
    *   **Tasks:**
        1.  **Choose Syncer Host:**
            *   Evaluate Supabase Edge Function (scheduled via cron). - `[ ]`
            *   Evaluate Next.js API Route / tRPC procedure (scheduled via Vercel Cron Jobs or similar). - `[x]`
            *   Decision Point: Select the most suitable hosting based on complexity, cost, and maintainability. - `[x]` (tRPC procedure chosen)
        2.  **Define Sync Trigger Mechanism:**
            *   Implement Periodic Batch Sync (e.g., hourly, daily) as the initial approach. - `[x]` (Global sync tRPC procedure implemented)
            *   Investigate Event-Driven Sync (e.g., Redis Keyspace Notifications, tRPC post-write hooks) for future enhancement if necessary. - `[ ]`
        3.  **Implement Syncer Core Logic:**
            *   Securely connect to Upstash Redis and Supabase PostgreSQL (manage credentials via environment variables). - `[x]`
            *   Query Redis for data needing archival (based on timestamps, "dirty" flags, or other markers). - `[x]`
            *   Transform Redis data structures to align with the Supabase PostgreSQL relational schema. - `[x]`
            *   Perform UPSERT (Update or Insert) operations into Supabase tables to ensure idempotency (use `sessionID`, `messageID` as primary keys). - `[x]`
            *   Implement state management for the syncer (e.g., "last synced timestamp/ID") to allow resumable syncs. - `[x]`
            *   Implement robust error handling, logging (e.g., to Supabase logs or external service), and retry mechanisms for failed writes. - `[x]`
*   **S-LTS2.2.3. Implement Direct Writes to Supabase (for specific non-chat events - Optional but Recommended):**
    *   **Objective:** Ensure critical non-chat data (e.g., user account creation, subscription changes) is written directly to Supabase for immediate durability.
    *   **Tasks:** Modify relevant tRPC resolvers to write such data to both Supabase and Redis (if needed for real-time availability).

## 4. Supabase PostgreSQL Setup

### 4.1. Define/Refine Relational Schema in Supabase
*   **Objective:** Ensure Supabase PostgreSQL has the necessary tables and columns to store all chat data originating from Dexie.js/Redis.
*   **Tasks:**
    1.  Review existing `lib/db/schema.ts` (Drizzle schema for PostgreSQL).
    2.  Ensure tables for `users`, `sessions` (chats), `messages`, `attachments_references` (if applicable), and any other relevant entities are defined.
    3.  Apply this schema to your Supabase PostgreSQL instance (e.g., using Drizzle migrations).

### 4.2. Configure Row Level Security (RLS)
*   **Objective:** Secure data access in Supabase.
*   **Tasks:**
    1.  Define RLS policies for all relevant tables.
    2.  Ensure the Redis-to-Supabase Syncer uses a service role key or a dedicated role with appropriate permissions to bypass RLS for writes.
    3.  Restrict direct user/client access to Supabase tables unless explicitly required for specific features (e.g., admin panel).

## 5. Impact on Existing System Components

### 5.1. Upstash Redis
*   **Tasks:**
    1.  Review and potentially augment Redis data structures (e.g., add `lastArchivedAt` timestamps or flags) to facilitate efficient identification of data for the syncer.
    2.  Ensure Redis data structures remain optimized for live application performance.

### 5.2. Dexie.js (Client)
*   No changes required. Dexie.js continues to sync with Upstash Redis.

### 5.3. Next.js API Routes / tRPC Server
*   **Tasks (if Syncer is hosted here):**
    1.  Develop the tRPC procedure(s) or API route(s) for the Syncer.
    2.  Integrate Supabase JS client (`supabase-js`) for database interactions.
    3.  Secure the Syncer endpoint (e.g., require a secret key if triggered by an external cron job).
*   **Tasks (Admin Endpoints - Future):** Plan for potential tRPC procedures for administrative access to Supabase data, with robust authorization.

### 5.4. Authentication
*   User IDs (likely from NextAuth.js, which might be linked to Supabase Auth if used as an identity provider, or directly from your `users` table) will serve as the foreign keys linking data across Redis and Supabase PostgreSQL.

## 6. Implementation Phases (Revised for Speed & Iteration)

This revised phasing prioritizes getting a core, functional syncer operational quickly, allowing for early testing and iterative improvements.

### Phase 1: Foundation & Minimal Viable Syncer (MVP) (1-2 weeks)
*   **Objective:** Establish the Supabase foundation and build a basic, testable syncer for a single data type.
*   **Tasks:**
    1.  **Supabase Schema & Security Basics:**
        *   Finalize and apply the PostgreSQL schema (from `lib/db/schema.ts`) to the Supabase instance using Drizzle migrations.
        *   Set up basic Row Level Security (RLS) policies in Supabase, focusing on a dedicated role/service key for the syncer to write data.
        *   Provision secure credentials (environment variables) for Redis and Supabase access for the syncer.
    2.  **Syncer Host & Trigger Decision (Initial):**
        *   Make a pragmatic decision for the *initial* syncer hosting (e.g., Next.js API Route/tRPC procedure for easier local development and debugging) and trigger mechanism (e.g., manual trigger or a simple Vercel Cron Job for periodic execution).
        *   *Rationale:* This can be optimized or changed later; the goal is rapid initial setup.
    3.  **MVP Syncer - Core Logic (e.g., New Messages Only):**
        *   Develop the syncer to connect to Upstash Redis and Supabase PostgreSQL.
        *   Implement logic to fetch only *new messages* from Redis. Start with a simple strategy (e.g., messages created after the last successful sync timestamp, or a temporary "needsSync" flag in Redis).
        *   Perform basic data transformation (if any) for messages to fit the Supabase schema.
        *   Implement UPSERT logic into the Supabase `messages` table, using `messageID` to ensure idempotency.
        *   Include minimal, essential error logging (e.g., `console.error` for critical failures).
        *   Implement basic state management for the syncer (e.g., storing and retrieving the timestamp of the last successfully synced message).
    4.  **Local Testing & Validation:**
        *   Thoroughly test the MVP syncer locally using sample Redis data and verifying writes to a development Supabase instance.

### Phase 2: Initial Deployment & Basic Monitoring (1 week)
*   **Objective:** Deploy the MVP syncer to a staging environment and establish basic operational monitoring.
*   **Tasks:**
    1.  **Deploy MVP Syncer:**
        *   Deploy the syncer to the chosen hosting environment (e.g., as part of your Next.js deployment on Vercel).
        *   Configure the scheduler (e.g., Vercel Cron Job) to trigger the syncer periodically (e.g., every few hours initially).
        *   Ensure secure credential management in the staging deployment environment.
    2.  **Staging Environment End-to-End Testing:**
        *   Conduct end-to-end tests in the staging environment with representative data flow (Client -> Redis -> Supabase via Syncer).
        *   Verify data integrity and timeliness of sync for messages.
    3.  **Basic Operational Monitoring Setup:**
        *   Utilize built-in logging from the hosting platform (e.g., Vercel Function logs).
        *   Monitor Supabase database logs for errors or unusual activity related to syncer writes.

### Phase 3: Incremental Enhancement & Expansion (2-3 weeks, iterative)
*   **Objective:** Gradually expand the syncer's capabilities and improve its robustness based on initial learnings.
*   **Tasks (Iterate through these for different data types/features):**
    1.  **Expand Data Scope:**
        *   Incrementally add sync logic for other essential data types (e.g., `sessions`/`chats`, ensuring `users` data is correctly referenced).
        *   Refine data fetching strategies from Redis for efficiency and completeness (e.g., more robust timestamp or flagging mechanisms).
    2.  **Improve Error Handling & Retries:**
        *   Implement more sophisticated error handling within the syncer (e.g., categorizing errors, specific retry logic for transient network issues vs. data validation errors).
        *   Consider a simple dead-letter mechanism for persistently failing items (e.g., logging them to a separate table/log for manual review).
    3.  **Enhance Logging & Alerting:**
        *   Integrate more detailed and structured logging (e.g., logging sync batch details, duration, number of items processed).
        *   Set up basic automated alerts for critical syncer failures or prolonged downtime.

### Phase 4: Optimization & Advanced Features (Ongoing/As Needed)
*   **Objective:** Optimize performance and consider more advanced capabilities once the core system is stable.
*   **Tasks:**
    1.  **Performance Optimization:**
        *   Based on monitoring and data volume, optimize syncer batch sizes, Redis query patterns, and Supabase write operations (e.g., bulk inserts if appropriate).
    2.  **Advanced RLS & Security Hardening:**
        *   Review and refine Supabase RLS policies for comprehensive data protection.
        *   Conduct a security review of the syncer access patterns and credential management.
    3.  **Consider Advanced Sync Triggers (Optional Enhancement):**
        *   If periodic batching proves to have unacceptable latency for certain data, evaluate event-driven sync mechanisms (e.g., Redis Streams, or tRPC resolvers queueing tasks for the syncer).
    4.  **Implement Direct Writes for Critical Non-Chat Events (Optional):**
        *   If deemed necessary for immediate durability (as per S-LTS2.2.3), modify relevant tRPC resolvers to write critical data (e.g., account changes) directly to Supabase in addition to Redis.

### Phase 5: Full Documentation & Production Readiness (1 week)
*   **Objective:** Ensure the system is well-documented and ready for production deployment.
*   **Tasks:**
    1.  **Comprehensive Documentation:**
        *   Document the Supabase integration architecture, data flow, syncer design, operational procedures (monitoring, troubleshooting), and RLS policies.
    2.  **Final Testing & Validation:**
        *   Complete all planned testing cycles, including stress testing if significant data volumes are anticipated soon.
    3.  **Production Deployment Strategy & Go-Live:**
        *   Plan the production deployment (e.g., initial bulk sync if migrating existing Redis data, then enabling periodic syncer).
        *   Deploy to production.
    4.  **Intensive Post-Go-Live Monitoring:**
        *   Closely monitor the syncer's performance, error rates, and data consistency in the production environment.

## 7. Non-Functional Requirements Checklist

*   **Data Consistency:** Verify eventual consistency model and acceptable delay.
*   **Performance:** Monitor Syncer impact on Redis/Supabase; ensure it runs efficiently in the background.
*   **Cost:** Estimate and monitor Supabase storage, compute, and operation costs.
*   **Scalability:** Design Syncer for increasing data volumes.
*   **Security:** Ensure all credentials are secure, RLS is effective, and access is restricted.
*   **Maintainability:** Ensure Syncer code is well-structured and documented.

## 8. Out of Scope (Initial Integration)

*   Real-time, bi-directional sync between Redis and Supabase.
*   Client applications directly querying Supabase for live chat data.
*   Complex data transformation logic within the Syncer beyond schema mapping.
*   Immediate offloading/trimming of data from Redis (post-archival optimization).

This plan provides a roadmap for integrating Supabase as the long-term archival layer for NexusChat, enhancing data durability and enabling new data utilization possibilities.