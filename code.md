# Product Requirements Document: "NexusChat" - AI-Powered Conversational Platform

**Version:** 1.3
**Date:** October 26, 2023 (Comprehensive Edition)
**Author/Team:** [Your Name/Team Name]

## 1. Introduction

### 1.1. Purpose
This document provides a comprehensive and detailed outline of the product requirements for "NexusChat," an advanced, fully responsive, AI-powered chat application. It serves as the definitive source of truth for all stakeholders, including product managers, designers, and development teams, covering all aspects from high-level vision to granular feature specifications and technical architecture. The goal is to ensure complete alignment and a shared understanding of the product to be built.

### 1.2. Product Vision
NexusChat is envisioned as a market-leading AI chat application, distinguished by its exceptional performance, intuitive user experience, and robust feature set. It will empower users with seamless, typesafe access to a diverse range of AI models for various conversational tasks, from creative brainstorming and content generation to technical problem-solving and learning. NexusChat will prioritize a "local-first" feel for responsiveness, backed by a reliable and scalable cloud infrastructure, setting a new standard for AI interaction platforms.

### 1.3. Goals & Objectives

#### 1.3.1. Primary Product Goal:
To develop and launch a best-in-class AI chat application that offers superior speed, usability, and feature depth compared to existing solutions, by leveraging a modern technology stack:
    *   **Frontend:** Next.js (App Router)
    *   **API Layer:** tRPC for end-to-end typesafe communication.
    *   **Client-Side Data & State:** React Query for server state management and caching, Dexie.js for local persistence.
    *   **AI Streaming:** Vercel AI SDK.
    *   **Backend:** Elixir with the Phoenix framework.
    *   **AI Model Access:** OpenRouter.
    *   **Database:** PostgreSQL.

#### 1.3.2. User Experience (UX) Goals:
    *   **Performance:** Deliver a near-instantaneous chat experience, with AI responses streaming in real-time without perceptible lag. Application navigation and data loading should feel immediate.
    *   **Intuition:** Provide an exceptionally intuitive, clean, and easy-to-navigate user interface that requires minimal learning curve, accessible across desktop, tablet, and mobile devices.
    *   **Reliability:** Ensure dependable message history, robust session management, and consistent application behavior.
    *   **Feedback:** Offer clear and timely visual feedback for all user actions, loading states, and error conditions.

#### 1.3.3. Technical Excellence Goals:
    *   **Typesafety:** Achieve end-to-end typesafety between the Next.js frontend and the Elixir backend via tRPC, significantly reducing runtime errors and improving developer experience.
    *   **Scalability:** Design and implement a highly scalable architecture capable of supporting a large and growing concurrent user base without performance degradation.
    *   **Maintainability:** Produce well-structured, documented, and testable code across the entire stack to facilitate ongoing development and maintenance.
    *   **Data Integrity & Security:** Guarantee the integrity and security of user data through robust backend logic, secure communication protocols, and best-practice data storage.

#### 1.3.4. Initial Market Differentiation:
    *   Unparalleled responsiveness and perceived speed due to optimized client-side architecture (React Query, Dexie.js) and efficient backend.
    *   Superior developer experience and product reliability due to the adoption of tRPC for typesafe APIs.
    *   Flexibility in AI model access through OpenRouter, allowing for future expansion of supported models.

### 1.4. Target Audience
    *   **Primary:** Tech-savvy individuals, developers, writers, students, and researchers who frequently use AI for productivity, learning, or creative pursuits and value performance and a polished user experience.
    *   **Secondary:** Professionals and small teams seeking a quick, reliable, and versatile AI assistant for day-to-day tasks.
    *   **Tertiary:** General users curious about AI capabilities who would benefit from a highly accessible and user-friendly platform.

## 2. Product Features

### 2.1. Core Chat Interface & AI Interaction

    *   **F2.1.1. User Input Area:**
        *   A resizable, multi-line text input field at the bottom of the chat view.
        *   Placeholder text (e.g., "Send a message...") when empty.
        *   Dynamic resizing: The input area height should expand as the user types, up to a predefined maximum (e.g., 1/3 of viewport height), after which it becomes scrollable.
        *   Keyboard shortcuts: "Enter" key to send the message. "Shift+Enter" or "Ctrl+Enter" to insert a newline character within the input field.
        *   Clear button: An optional "X" icon to clear the input field content quickly.
    *   **F2.1.2. Send Message Button:**
        *   A clearly visible icon button (e.g., paper airplane icon) adjacent to the input area.
        *   The button's state should be visually distinct (e.g., enabled/disabled color) based on whether the input field contains text. It will be disabled if the input field is empty.
        *   Clicking the button submits the current message content.
    *   **F2.1.3. AI Model Interaction (via Elixir Backend & OpenRouter):**
        *   When a user submits a message, the Next.js frontend will initiate an API call to the Elixir backend.
        *   This API call will be specifically designed for AI response streaming and consumed by the Vercel AI SDK on the client.
        *   The Elixir backend will securely manage OpenRouter API keys and will proxy the request (including message history from the current session) to the configured AI model via OpenRouter.
        *   The backend will handle any necessary request formatting or parameterization for OpenRouter.
    *   **F2.1.4. Real-time Message Streaming (Vercel AI SDK):**
        *   The Next.js frontend will utilize Vercel AI SDK hooks (e.g., `useChat` or `useCompletion`).
        *   As the Elixir backend receives streamed tokens from OpenRouter, it will forward them through its streaming HTTP endpoint.
        *   The Vercel AI SDK will consume this stream, progressively updating the content of the AI's message bubble in the UI in real-time.
        *   This provides an immediate, "typing" effect for the AI response.
    *   **F2.1.5. Markdown Rendering in Messages:**
        *   Both user-sent messages (if they contain Markdown) and AI-generated responses must be rendered with support for common Markdown syntax:
            *   Headings (H1-H6)
            *   Bold (`**text**` or `__text__`)
            *   Italics (`*text*` or `_text_`)
            *   Strikethrough (`~~text~~`)
            *   Unordered lists (`-`, `*`, `+`)
            *   Ordered lists (`1.`, `2.`)
            *   Blockquotes (`> text`)
            *   Inline code (`\`code\``)
            *   Code blocks (triple backticks ``` with optional language specifier).
            *   Links (`[text](url)`)
            *   Tables (GitHub Flavored Markdown).
        *   A robust and secure Markdown parsing library will be used on the frontend.
    *   **F2.1.6. Code Block Enhancements:**
        *   Rendered code blocks must have:
            *   Syntax highlighting based on the specified language (or auto-detected if possible).
            *   A clear visual distinction from normal text (e.g., background color, monospaced font).
            *   A "Copy" button (e.g., icon overlay on hover) that copies the entire code block content to the user's clipboard with a single click. A visual confirmation (e.g., "Copied!") should be briefly displayed.
    *   **F2.1.7. Message Display Area:**
        *   A scrollable container occupying the main portion of the chat view.
        *   Messages should be displayed as distinct "bubbles" or blocks.
        *   User messages aligned to one side (e.g., right), AI messages to the other (e.g., left).
        *   Clear visual differentiation for sender (e.g., different background colors, small avatars/icons if implemented).
        *   Optional display of timestamps for each message (e.g., "10:35 AM" or relative "5 min ago"). This could be a user configurable setting.
        *   The display area must automatically scroll to the bottom to show the latest message when a new message is sent by the user or fully received from the AI. Users should also be able to scroll up to review history. A "Scroll to Bottom" button may appear if the user has scrolled up and new messages arrive.
    *   **F2.1.8. Copy Message Content:**
        *   Each message bubble (both user and AI) should have an easily accessible option (e.g., on hover, or via a "..." menu) to copy its plain text content to the clipboard.
        *   A visual confirmation (e.g., "Message copied!") should be briefly displayed.
    *   **F2.1.9. Regenerate AI Response:**
        *   An option (e.g., "Regenerate" button or icon) should be available specifically for the last AI-generated message in the current session.
        *   Clicking this will resend the user's preceding prompt (and conversation history up to that point) to the AI via the Elixir backend.
        *   The Vercel AI SDK will handle the new streaming response. The UI should clearly indicate that a regeneration is in progress.
        *   The newly generated AI response will replace the previous one, or be appended with clear differentiation (TBD based on UX preference).
    *   **F2.1.10. Stop AI Response Generation:**
        *   While an AI response is being streamed, a "Stop Generating" button or icon must be visible and functional.
        *   The Vercel AI SDK typically provides a `stop()` function that the UI will call.
        *   Upon stopping, the partially generated AI message remains in the chat view as is. The user can then send a new message or regenerate.

### 2.2. Session Management (Conversations)
A "session" represents a distinct, continuous conversation thread between the user and the AI, identified by a unique `sessionID`.

    *   **F2.2.1. Session Entity Definition:**
        *   **Attributes (minimum for client & server):**
            *   `sessionID`: Universally Unique Identifier (UUID v4), generated client-side for optimistic updates, primary key.
            *   `title`: Text (max 255 characters), user-editable. Defaults to an auto-generated title.
            *   `createdAt`: Timestamp (ISO 8601 string), set upon creation on the client and finalized by the server.
            *   `lastUpdatedAt`: Timestamp (ISO 8601 string), updated whenever a new message is added or the title is changed. Crucial for ordering.
            *   `userID`: Foreign Key to `users` table (if authentication is implemented). Nullable if anonymous users are allowed. Stored on server, potentially on client if auth is active.
            *   `autoGeneratedTitle`: Boolean, indicates if the current `title` was auto-generated (`true`) or user-set (`false`).
            *   `messageCount` (optional, server-side): Number of messages in the session.
            *   `modelUsed` (optional, server-side): Default or last AI model used in this session.

    *   **F2.2.2. Automatic Session Creation:**
        *   **Trigger:** User types and sends their *first* message in an "empty" chat context (i.e., no active session is selected in the UI, or immediately after clicking the "New Chat" button).
        *   **Client-Side Workflow (Next.js, Dexie.js, React Query, tRPC):**
            1.  A new `sessionID` (UUID) is generated client-side.
            2.  An initial session object is optimistically created in Dexie.js with the new `sessionID`, an auto-generated title (see F2.2.4), `createdAt` and `lastUpdatedAt` timestamps, and `autoGeneratedTitle: true`.
            3.  The first user message is associated with this new `sessionID` in Dexie.js.
            4.  The client's React Query cache for the session list is optimistically updated to include this new session at the top.
            5.  A **tRPC mutation** (`sessions.create`) is called, sending the new `sessionID`, the initial user message content (for title generation on backend and message persistence), and other relevant session metadata.
        *   **Server-Side Workflow (Elixir, PostgreSQL):**
            1.  The Elixir backend receives the `sessions.create` tRPC call.
            2.  It validates the input. If a `sessionID` is provided and already exists for the user (edge case, unlikely), it might return an error or handle gracefully.
            3.  A new session record is created in the PostgreSQL `sessions` table with the provided `sessionID` (or server-generated if client didn't send one), an auto-generated title (if not provided or to be confirmed by server logic), `createdAt`, `lastUpdatedAt`, and `userID` (if applicable).
            4.  The initial user message is also persisted in the `messages` table, linked to this new session.
            5.  The backend returns the confirmed, fully populated session object (and potentially the persisted user message object) to the client.
        *   **Client-Side Post-Mutation:**
            1.  React Query updates its cache with the confirmed session data from the backend, reconciling any differences from the optimistic update.
            2.  Dexie.js is updated with the confirmed server data.

    *   **F2.2.3. Explicit "New Chat" Button:**
        *   **UI Element:** A prominent button (e.g., "+ New Chat", "Start Conversation") consistently located, typically at the top of the Session History Sidebar.
        *   **Interaction Flow:**
            1.  User clicks the "New Chat" button.
            2.  The main message display area in the UI is cleared of any previous messages.
            3.  Any currently "active" session in the UI is deselected.
            4.  The application is now in a state ready for a new session to be created as per F2.2.2 upon the user sending their next message. No session is persisted until the first message is sent.
            5.  The input field is focused, prompting the user to type.

    *   **F2.2.4. Automatic Session Title Generation:**
        *   **Trigger:** Occurs when a new session is created (either client-side optimistically or finalized on the server).
        *   **Client-Side Logic (Initial Guess):** The client may generate a provisional title from the first N (e.g., 5-7) words of the user's initial message in that session to provide immediate UI feedback.
        *   **Server-Side Logic (Definitive):** The Elixir backend will perform the definitive title generation based on the first user message content. This ensures consistency if multiple clients are involved or if the logic is complex. The logic should strip excessive whitespace and potentially filter out common short words.
        *   **Storage:** The generated title is stored in the `title` field of the session object. The `autoGeneratedTitle` flag is set to `true`.
        *   **Display:** This title is displayed in the Session History Sidebar for the respective session.

    *   **F2.2.5. Session History Sidebar:**
        *   **UI Element:** A collapsible/expandable sidebar panel, typically on the left side of the application on desktop. On mobile devices, this sidebar may be hidden by default and toggled via a hamburger menu icon or a swipe gesture.
        *   **Content:** Displays a list of all sessions associated with the current user (fetched via a **tRPC query** like `sessions.list` and managed by React Query).
        *   **Loading Data:**
            1.  On initial app load, React Query attempts to fetch the session list using `sessions.list`.
            2.  The query can be configured to initially hydrate from Dexie.js if data is available locally, providing an instant "skeleton" or full list.
            3.  React Query will then fetch fresh data from the backend in the background (stale-while-revalidate).
        *   **Session Item Representation in Sidebar:**
            *   Each item in the list represents one session.
            *   Must display the session `title`. If the title is too long, it should be truncated with an ellipsis.
            *   Optionally, may display a short preview of the last message content or a relative `lastUpdatedAt` timestamp (e.g., "5 min ago", "Yesterday", "Oct 20").
            *   The currently active/selected session in the main chat view must be visually highlighted in the sidebar (e.g., different background color, accent border).
            *   Hover states for session items to indicate interactivity.
        *   **Ordering:** Sessions *must* be listed in reverse chronological order based on their `lastUpdatedAt` timestamp. The most recently active session (i.e., session with the newest message or most recent title change) appears at the top. This ordering is handled by the backend `sessions.list` tRPC query.
        *   **Performance:**
            *   For users with a very large number of sessions (e.g., >100-200), the sidebar list rendering should be optimized using techniques like list virtualization (e.g., using `react-window` or `react-virtualized`) to prevent UI slowdowns. React Query's pagination support can also be used here.
        *   **Real-time Updates via React Query:**
            *   The session list displayed by React Query will automatically update when:
                *   A new session is created (after the `sessions.create` mutation succeeds and relevant queries are invalidated/refetched).
                *   A session's title is changed (after `sessions.updateTitle` mutation).
                *   A session's `lastUpdatedAt` changes due to a new message (the `sessions.list` query should be refetched or intelligently updated).
                *   A session is deleted (after `sessions.delete` mutation).
            *   React Query handles these updates through query invalidation and automatic refetching, or optimistic updates.

    *   **F2.2.6. Switching Sessions:**
        *   **Interaction:** User clicks on a specific session item in the Session History Sidebar.
        *   **Client-Side Workflow (Next.js, React Query, Dexie.js):**
            1.  The `sessionID` of the clicked session becomes the "current active session ID" in the client-side application state (e.g., React Context or a global state manager like Zustand).
            2.  The UI of the Session History Sidebar updates to visually highlight the newly selected session item.
            3.  The main chat message display area is cleared.
            4.  Messages for the selected `sessionID` are fetched. This will typically involve a **React Query query** (e.g., `messages.listBySession({ sessionID })`).
                *   This query can also attempt to hydrate from Dexie.js first for speed.
                *   React Query will then fetch from the backend tRPC endpoint to ensure data is fresh and complete.
            5.  Once messages are fetched, they are rendered in the message display area, ordered chronologically.
            6.  The user input area becomes active, and any new messages sent by the user will be associated with this now-active session.
            7.  The URL might update to reflect the active session (e.g., `/chat/{sessionID}`), enabling direct linking and browser history.

    *   **F2.2.7. Session Renaming:**
        *   **Interaction:**
            *   User hovers over a session item in the sidebar.
            *   An "edit" icon (e.g., pencil icon) appears. Clicking it, or alternatively, using a right-click context menu and selecting "Rename," initiates the rename process.
        *   **UI Flow:**
            1.  The session title text in the sidebar item transforms into an editable inline input field, pre-filled with the current title. The input field should automatically receive focus.
            2.  User types the new title.
            3.  User confirms the change by pressing "Enter" or clicking outside the input field.
            4.  User can cancel the rename by pressing "Escape," which reverts the input field to the original title text.
        *   **Client-Side Workflow (Optimistic Update with React Query & tRPC):**
            1.  When the user confirms the new title:
            2.  React Query can perform an optimistic update: the session list in the UI immediately reflects the new title, and the corresponding session object in Dexie.js is also updated with the new title and `autoGeneratedTitle: false`.
            3.  A **tRPC mutation** (e.g., `sessions.updateTitle({ sessionID, newTitle })`) is called to persist the change on the backend. The `lastUpdatedAt` timestamp for the session may also be updated on the backend to reflect this activity, potentially reordering the session list.
            4.  **On Mutation Success:** React Query confirms the optimistic update. If the backend returns slightly different data (e.g., a trimmed title), React Query reconciles it. The session list query (`sessions.list`) might be invalidated and refetched to ensure order and consistency if `lastUpdatedAt` changed.
            5.  **On Mutation Failure:** React Query rolls back the optimistic update (reverting the title in the UI and Dexie.js to its original state). A user-friendly error message is displayed (e.g., "Failed to rename session. Please try again.").

    *   **F2.2.8. Session Deletion:**
        *   **Interaction:**
            *   User hovers over a session item in the sidebar.
            *   A "delete" icon (e.g., trash can icon) appears. Clicking it, or alternatively, using a right-click context menu and selecting "Delete," initiates the delete process.
        *   **UI Confirmation Dialog:**
            *   Before any deletion occurs, a modal confirmation dialog *must* be displayed.
            *   Dialog Title: e.g., "Delete Conversation?"
            *   Dialog Message: e.g., "Are you sure you want to permanently delete the conversation titled '[Session Title]'? This action cannot be undone."
            *   Buttons: "Cancel" and "Delete" (styled distinctively, e.g., "Delete" is red).
        *   **Client-Side Workflow (Optimistic Update with React Query & tRPC):**
            1.  If the user confirms deletion:
            2.  React Query performs an optimistic update: the session is immediately removed from the UI list. The session record and all its associated message records are optimistically removed from Dexie.js.
            3.  A **tRPC mutation** (e.g., `sessions.delete({ sessionID })`) is called.
            4.  **On Mutation Success:** React Query confirms the optimistic update. The `sessions.list` query is typically invalidated and refetched. If the deleted session was the currently active one, the UI should revert to a state similar to clicking "New Chat" (empty message area, no active session).
            5.  **On Mutation Failure:** React Query rolls back the optimistic update (re-adding the session to the UI list and Dexie.js). A user-friendly error message is displayed (e.g., "Failed to delete session. Please try again.").
        *   **Server-Side Workflow (Elixir, PostgreSQL):**
            1.  The Elixir backend receives the `sessions.delete` tRPC call.
            2.  It authenticates/authorizes the request.
            3.  It deletes the specified session record from the `sessions` table and all associated message records from the `messages` table (using cascade delete constraints in PostgreSQL is recommended).
            4.  It returns a success status.

### 2.3. Message Persistence & Lifecycle

    *   **F2.3.1. User Message Sending and Persistence:**
        1.  **User Action:** User types a message in the input area and clicks "Send" or presses "Enter."
        2.  **Client-Side (Optimistic UI & tRPC Call):**
            *   A unique `messageID` (UUID) is generated client-side.
            *   The user's message (with its client-generated `messageID`, `sessionID` of the active session, `senderType: 'user'`, `content`, and `timestamp`) is optimistically added to the UI message display area and to the Dexie.js `messages` table for the active session.
            *   The `lastUpdatedAt` timestamp of the active session is optimistically updated in Dexie.js and the React Query cache for the session list (potentially reordering it).
            *   A **tRPC mutation** (e.g., `messages.createUserMessage({ sessionID, clientMessageID, content })`) is called to send the message content to the backend for persistence.
            *   Simultaneously, or immediately after, the client initiates the AI response stream using the Vercel AI SDK, passing the current conversation history (including this new optimistic user message) to the backend's AI streaming endpoint.
        3.  **Server-Side (Elixir, PostgreSQL):**
            *   The `messages.createUserMessage` tRPC call is received. The backend persists the user message to the PostgreSQL `messages` table, associating it with the `sessionID` and `userID`. It also updates the `last_updated_at` field on the parent `sessions` table.
            *   The backend returns a confirmation, including the server-confirmed `messageID` (which might be the same as the client-generated one or a new one if the server generates IDs).
        4.  **Client-Side (Reconciliation):**
            *   React Query reconciles the optimistic user message with the confirmed data from the backend.
            *   Dexie.js is updated with any server-confirmed details.

    *   **F2.3.2. AI Message Streaming and Persistence:**
        1.  **Streaming:** As described in F2.1.4, the Vercel AI SDK handles the real-time display of the AI's streaming response. The full content of the AI message is accumulated client-side by the SDK.
        2.  **Client-Side (Post-Stream Persistence Call):**
            *   Once the AI response stream concludes (either normally or if stopped by the user):
            *   A unique `messageID` (UUID) is generated client-side for this AI message.
            *   The Vercel AI SDK typically provides the complete AI message content.
            *   This complete AI message (with its client-generated `messageID`, `sessionID`, `senderType: 'ai'`, full `content`, `timestamp`, and `modelName` used) is optimistically added to the UI and Dexie.js.
            *   The `lastUpdatedAt` timestamp of the active session is again optimistically updated.
            *   A **tRPC mutation** (e.g., `messages.createAiMessage({ sessionID, clientMessageID, content, modelName })`) is called to persist the *complete* AI message to the backend.
        3.  **Server-Side (Elixir, PostgreSQL):**
            *   The `messages.createAiMessage` tRPC call is received. The backend persists the complete AI message to the PostgreSQL `messages` table. It also updates the `last_updated_at` field on the parent `sessions` table.
            *   The backend returns a confirmation.
        4.  **Client-Side (Reconciliation):**
            *   React Query reconciles the optimistic AI message.
            *   Dexie.js is updated.

    *   **F2.3.3. Client-Side Cache (Dexie.js):**
        *   **Schema:**
            *   `sessions`: (`sessionID` (primary key, String), `title` (String), `createdAt` (Date), `lastUpdatedAt` (Date, indexed), `userID` (String, nullable, indexed for multi-user scenarios), `autoGeneratedTitle` (Number: 0 or 1)).
            *   `messages`: (`messageID` (primary key, String), `sessionID` (String, indexed), `senderType` (String: 'user' or 'ai'), `content` (String), `timestamp` (Date, indexed), `modelName` (String, nullable for user messages), `orderInSession` (Number, for strict ordering if timestamps are identical, though usually timestamp is sufficient)).
        *   **Role:** Acts as a fast, local cache. It can be used to:
            *   Provide initial data to React Query queries for instant UI rendering ("skeleton" or full content if available).
            *   Store optimistic updates before server confirmation.
            *   Allow viewing of previously loaded conversations even if offline (read-only mode if offline).
        *   **Synchronization:** Dexie.js is kept in sync with the server (the source of truth) via React Query's data fetching and mutation lifecycle. Successful fetches/mutations update Dexie.

    *   **F2.3.4. Backend Persistence (PostgreSQL - Source of Truth):**
        *   **Schema:**
            *   `users` table (if authentication is implemented): (`user_id` (UUID, PK), `email` (TEXT, unique), `password_hash` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ)).
            *   `sessions` table: (`session_id` (UUID, PK), `user_id` (UUID, FK to `users.user_id`, nullable if anonymous), `title` (TEXT), `is_auto_generated_title` (BOOLEAN), `created_at` (TIMESTAMPTZ), `last_updated_at` (TIMESTAMPTZ)).
            *   `messages` table: (`message_id` (UUID, PK), `session_id` (UUID, FK to `sessions.session_id` with ON DELETE CASCADE, indexed), `user_id` (UUID, FK to `users.user_id`, nullable, can be inferred from session), `sender_type` (VARCHAR(10), CHECK `sender_type` IN ('user', 'ai')), `content` (TEXT), `model_name` (VARCHAR(255), nullable), `timestamp` (TIMESTAMPTZ), `client_message_id` (UUID, nullable, unique per session, for idempotency if needed)).
        *   All create, update, and delete operations are ultimately performed against PostgreSQL via the Elixir backend.

    *   **F2.3.5. Data Synchronization Strategy with React Query & tRPC:**
        *   **Primary Mechanism:** React Query manages the client's server state.
        *   **Fetching Data (Queries):** `useQuery` hooks (wrapping tRPC procedures like `sessions.list` or `messages.listBySession`) fetch data. React Query handles caching, background refetching (stale-while-revalidate, refetch on window focus, refetch on interval), and deduplication of requests.
        *   **Modifying Data (Mutations):** `useMutation` hooks (wrapping tRPC procedures like `sessions.create`, `messages.createUserMessage`, `sessions.delete`) modify data.
            *   **Optimistic Updates:** For a responsive UI, mutations can optimistically update the React Query cache (and subsequently Dexie.js) before the server responds.
            *   **Invalidation & Refetching:** On successful mutation, relevant queries are invalidated, causing React Query to refetch them to ensure consistency with the server.
            *   **Rollback:** If a mutation fails, optimistic updates are rolled back.
        *   **Dexie.js Synchronization:** Dexie.js is updated within the `onSuccess` callbacks of React Query's `useQuery` (for fetched data) and `useMutation` (for confirmed mutations), or as part of optimistic update logic.

### 2.4. User Authentication (Future Enhancement - Design Considerations)

    *   **F2.4.1. Account Creation & Login:**
        *   Standard email/password registration and login.
        *   Potential for OAuth providers (Google, GitHub).
        *   Secure password hashing (e.g., Argon2, bcrypt) on the backend.
    *   **F2.4.2. Session Management (Auth Tokens):**
        *   Use secure tokens (e.g., JWTs) stored in HttpOnly cookies or secure local storage.
        *   tRPC procedures would require authentication context.
    *   **F2.4.3. User Profile:**
        *   Basic profile page (e.g., change password, view API key usage if applicable).
        *   Fetched via a tRPC query managed by React Query.
    *   **F2.4.4. Data Association:** All sessions and messages will be strictly associated with a `userID` on the backend. API endpoints will enforce ownership.
    *   **F2.4.5. Unauthenticated Experience:**
        *   If unauthenticated, sessions and messages could be stored only locally in Dexie.js. Upon login/signup, an option to migrate local data to the user's account could be provided.
        *   Alternatively, anonymous users could have temporary server-side sessions tied to a client identifier, with an option to claim them upon account creation.

### 2.5. UI/UX Details

    *   **F2.5.1. Fully Responsive Design:**
        *   The application layout must fluidly adapt to all common screen sizes (desktop, laptop, tablet, mobile).
        *   Specific attention to mobile:
            *   Session sidebar might be an overlay or slide-in panel.
            *   Touch targets must be adequately sized.
            *   Font sizes and spacing adjusted for readability.
            *   Input methods optimized for touch keyboards.
    *   **F2.5.2. Intuitive Chat Interface & Navigation:**
        *   Follow established chat application conventions to minimize learning curve.
        *   Clear visual hierarchy. Consistent use of colors, typography, and iconography.
        *   Primary actions (New Chat, Send Message) should be immediately obvious.
        *   Secondary actions (Rename, Delete Session, Copy Message) should be discoverable through context menus or hover interactions.
    *   **F2.5.3. Loading States & Indicators:**
        *   **React Query Integration:**
            *   `isLoading` state from `useQuery` to show initial loading spinners/skeletons (e.g., for session list, messages).
            *   `isFetching` state to indicate background refetches (e.g., a subtle loading indicator).
            *   `isMutating` state from `useMutation` to disable buttons or show inline spinners during CUD operations.
        *   **Vercel AI SDK:** Provides visual cues for AI response generation (e.g., a blinking cursor or "AI is typing..." indicator in the AI message bubble).
        *   Overall application loading: A full-page loader or splash screen for the very first app load if significant assets need to be fetched.
    *   **F2.5.4. Error Handling and Display:**
        *   **tRPC & React Query Integration:**
            *   Errors from tRPC procedures are automatically caught by React Query.
            *   The `error` object from `useQuery` or `useMutation` can be used to display user-friendly error messages.
            *   **Global Error Notifications:** Use a toast notification system (e.g., `react-toastify`) to display non-critical errors or success messages.
            *   **Inline Errors:** For form submissions or specific actions, display errors contextually (e.g., "Invalid title format" next to the rename input).
            *   **Specific Error Types:**
                *   Network errors: "Unable to connect. Please check your internet connection."
                *   Server errors (5xx): "Something went wrong on our end. Please try again later."
                *   Authentication errors (401/403): Redirect to login or show "Access denied."
                *   Validation errors (4xx): Display specific error messages from the backend.
        *   **Retry Mechanisms:** React Query provides automatic retries for queries on network failures. For mutations, provide manual retry options.
    *   **F2.5.5. Settings/Configuration (Basic Initial):**
        *   A simple settings modal or page accessible from the main UI.
        *   Option to clear local Dexie.js cache (for debugging or freeing up space).
        *   (Future) Toggle for message timestamps, theme selection (light/dark), AI model selection.
        *   (If authenticated) Logout button, link to profile management.
    *   **F2.5.6. Accessibility (A11Y):**
        *   Strive for WCAG 2.1 Level AA compliance.
        *   Full keyboard navigation for all interactive elements.
        *   Proper use of ARIA attributes for dynamic content and custom controls.
        *   Sufficient color contrast.
        *   Focus management for modals and interactive elements.
        *   Semantic HTML structure.

### 2.6. OpenRouter Integration (Elixir Backend Responsibility)

    *   **F2.6.1. Secure API Key Management:**
        *   The OpenRouter API key(s) *must* be stored securely on the Elixir backend (e.g., via environment variables or a secure secrets management system).
        *   The API key must *never* be exposed to the Next.js frontend.
    *   **F2.6.2. AI Model Routing & Selection:**
        *   Initially, the backend will use a default AI model configured for OpenRouter.
        *   The architecture should allow for future expansion to support user selection of different AI models available through OpenRouter. This would involve the client sending a model preference, which the backend then uses in its request to OpenRouter.
    *   **F2.6.3. Request Formatting & Proxying:**
        *   The Elixir backend will receive the conversation history (and current prompt) from the Next.js client (via the Vercel AI SDK's initiation call).
        *   It will format this data according to the specific requirements of the target OpenRouter model API (e.g., structure of message objects, system prompts, parameters like temperature, max tokens).
        *   It will make the HTTP request to OpenRouter and handle the streaming response, relaying it back to the client.
    *   **F2.6.4. Error Handling from OpenRouter:**
        *   The backend must gracefully handle errors from OpenRouter (e.g., API errors, rate limits, model unavailability) and translate them into appropriate error responses or statuses for the client.

### 2.7. Elixir Backend (Phoenix Framework)

    *   **F2.7.1. API Endpoint Design for tRPC Consumption:**
        *   The Elixir backend will expose standard HTTP RESTful (or GraphQL-like, though REST is simpler for tRPC bridging) endpoints.
        *   These endpoints are *not directly called by the frontend developer*, but are the targets for the tRPC procedures defined in the Next.js application.
        *   **Required Endpoints:**
            *   `/api/ai/stream`: An HTTP endpoint that accepts POST requests with conversation history and streams back the AI's response using `text/event-stream` or chunked transfer encoding, compatible with the Vercel AI SDK.
            *   `/api/trpc/{procedure_path}`: A conventional base path that Next.js tRPC client will use. The Elixir backend will have controllers/actions mapped to these paths to handle requests for:
                *   `sessions.list`: GET request to fetch all sessions for a user.
                *   `sessions.create`: POST request to create a new session (and its first user message).
                *   `sessions.updateTitle`: PUT/PATCH request to update a session's title.
                *   `sessions.delete`: DELETE request to delete a session.
                *   `messages.listBySession`: GET request to fetch messages for a specific session.
                *   `messages.createUserMessage`: POST request to persist a user-sent message.
                *   `messages.createAiMessage`: POST request to persist a fully received AI message.
                *   (If auth) `auth.login`, `auth.register`, `auth.logout`, `users.getProfile`.
        *   Each endpoint will perform input validation, business logic, database interaction (via Ecto), and return JSON responses with appropriate HTTP status codes.
    *   **F2.7.2. WebSocket Support (Phoenix Channels - Optional, for specific non-core real-time):**
        *   While tRPC/React Query (with polling/refetching) and Vercel AI SDK (for AI stream) handle most real-time needs, Phoenix Channels can be used for:
            *   Broadcasting truly instantaneous updates to *other connected clients of the same user* if a change is made on one device (e.g., session renamed on desktop, immediately updates on mobile). This avoids waiting for React Query's next polling interval.
            *   (Future) Real-time collaborative features if ever implemented.
            *   Administrative broadcasts or system notifications.
    *   **F2.7.3. Database Interaction (Ecto):**
        *   Ecto will be used for all database interactions with PostgreSQL.
        *   Define Ecto schemas mapping to database tables.
        *   Use Ecto changesets for data validation before persistence.
        *   Leverage Ecto queries for efficient data retrieval.
        *   Manage database migrations using Ecto's migration tools.
    *   **F2.7.4. Business Logic & Service Layer:**
        *   Encapsulate core business logic within Elixir modules (contexts or services) separate from Phoenix controllers/endpoint handlers. This promotes testability and maintainability.

### 2.8. tRPC & React Query Integration Deep Dive (Frontend)

    *   **F2.8.1. tRPC Router Definition (Next.js):**
        *   A main tRPC router will be defined in the Next.js application (e.g., in `server/trpc/router.ts`).
        *   This router will compose sub-routers for different concerns (e.g., `sessionsRouter`, `messagesRouter`, `authRouter`).
        *   Each procedure (query or mutation) will be defined with:
            *   Input validation using a schema library like Zod (ensuring data from client matches expectations).
            *   An resolver function that makes an HTTP request to the corresponding Elixir backend endpoint. The tRPC client setup will handle the actual HTTP call.
    *   **F2.8.2. tRPC Client Setup (Next.js):**
        *   The tRPC client will be configured in the Next.js `_app.tsx` (or equivalent in App Router) to communicate with the Elixir backend API endpoints.
        *   It will use an HTTP batch link for query efficiency and an HTTP link for mutations.
    *   **F2.8.3. Using tRPC with React Query:**
        *   React Query's `useQuery` hook will be used to call tRPC query procedures (e.g., `trpc.sessions.list.useQuery()`). This provides:
            *   Typesafe data fetching.
            *   Automatic caching, background updates, stale-while-revalidate.
            *   Loading and error states.
        *   React Query's `useMutation` hook will be used to call tRPC mutation procedures (e.g., `trpc.sessions.delete.useMutation()`). This provides:
            *   Typesafe data modification.
            *   Callbacks for `onSuccess`, `onError`, `onMutate` (for optimistic updates).
            *   Automatic query invalidation on success to refetch related data.
    *   **F2.8.4. Typesafety Benefits:**
        *   The types for API inputs, outputs, and errors are automatically inferred from the tRPC router definition and available in the Next.js frontend.
        *   This eliminates entire classes of bugs related to API contract mismatches and improves developer productivity through autocompletion and compile-time checks.
    *   **F2.8.5. Optimistic Updates with React Query:**
        *   For actions like creating, renaming, or deleting sessions/messages, optimistic updates will be implemented using `useMutation`'s `onMutate` and `onError` (for rollback) callbacks.
        *   This involves updating the React Query cache (and subsequently Dexie.js) immediately upon user action, providing a very responsive UI, before the server confirms the change.
    *   **F2.8.6. Error Handling Flow:**
        *   If an Elixir backend endpoint returns an error (e.g., 4xx, 5xx), the tRPC client wrapper will transform this into a tRPC error.
        *   React Query's `useQuery` or `useMutation` hooks will expose this error object to the UI components.
        *   UI components will render appropriate error messages based on the error type and content.

## 3. Technical Requirements

### 3.1. Frontend (Next.js)
    *   **Framework:** Next.js (latest stable version, preferably using the App Router for Server Components and streamlined tRPC setup).
    *   **Language:** TypeScript (strict mode).
    *   **API Layer:** tRPC for defining backend procedures and calling them from the frontend. Zod for input/output schema validation with tRPC.
    *   **Data Fetching & Server State Management:** React Query (TanStack Query v5).
    *   **AI Client SDK:** Vercel AI SDK for consuming AI streams and managing chat UI state.
    *   **Local Client-Side Persistence:** Dexie.js (wrapper for IndexedDB).
    *   **Styling:** Tailwind CSS is recommended for rapid UI development and utility-first approach. Alternatively, CSS Modules, Emotion, or Styled Components.
    *   **UI Component Library (Optional):** A headless UI library like Radix UI or Headless UI for building accessible custom components, or a full component library like Chakra UI, Material UI (MUI), or Mantine if faster pre-styled component development is prioritized.
    *   **Form Handling (Optional):** Libraries like React Hook Form for complex forms (e.g., settings, future profile editing).
    *   **Markdown Rendering:** `react-markdown` with plugins like `remark-gfm` (for tables, etc.).
    *   **Code Syntax Highlighting:** `react-syntax-highlighter` or integration with Prism.js/Highlight.js.
    *   **Linting & Formatting:** ESLint, Prettier, configured for TypeScript and React.
    *   **Build Tool:** Next.js's built-in SWC/Webpack.
    *   **Testing:** Jest and React Testing Library for unit and integration tests. Playwright or Cypress for end-to-end tests.

### 3.2. Backend (Elixir/Phoenix)
    *   **Language/Framework:** Elixir (latest stable LTS version) with the Phoenix framework (latest stable version).
    *   **API Structure:** Standard Phoenix controllers and actions to expose HTTP endpoints that the Next.js tRPC procedures will call.
    *   **Database ORM/Wrapper:** Ecto.
    *   **JSON Handling:** Jason for serializing/deserializing JSON responses.
    *   **OpenRouter HTTP Client:** Tesla or HTTPoison.
    *   **Environment Configuration:** Secure management of API keys (OpenRouter, database credentials, etc.) via environment variables (e.g., using `.env` files locally, platform-specific env vars in production).
    *   **Testing:** ExUnit for unit and integration tests. Mox for mocking external services.
    *   **Logging:** Elixir/Phoenix default logger, configured for appropriate log levels in different environments.

### 3.3. Database (PostgreSQL)
    *   **Version:** Latest stable PostgreSQL version.
    *   **Schema:** As defined in F2.3.4. Foreign key constraints, `ON DELETE CASCADE` for messages when a session is deleted. Appropriate indexing on frequently queried columns (`session_id` in `messages`, `user_id` in `sessions` and `messages`, `last_updated_at` in `sessions`, `timestamp` in `messages`).
    *   **Migrations:** Managed by Ecto migrations.
    *   **Backup and Recovery:** A robust strategy for regular automated database backups and well-tested recovery procedures must be in place for production environments. Point-In-Time Recovery (PITR) if supported by the hosting provider.
    *   **Connection Pooling:** Handled by Ecto's DBConnection.

### 3.4. Deployment
    *   **Frontend (Next.js):** Vercel is the recommended platform due to its seamless integration with Next.js, tRPC, and the Vercel AI SDK.
    *   **Backend (Elixir/Phoenix):** Platforms like Fly.io, Gigalixir, Render, or managed Kubernetes/VMs (AWS, GCP, Azure). Choice depends on scalability needs, operational overhead tolerance, and cost.
    *   **Database (PostgreSQL):** A managed PostgreSQL service is highly recommended (e.g., AWS RDS, Google Cloud SQL, Supabase, Neon, Crunchy Data, Aiven).
    *   **CI/CD Pipeline:** GitHub Actions, GitLab CI, or Vercel Deploy Hooks for automated builds, tests, and deployments for both frontend and backend. Separate pipelines for different environments (dev, staging, production).
    *   **Environment Variables:** Securely managed per environment for frontend and backend (e.g., Vercel environment variables, platform-specific for backend).

### 3.5. Security
    *   **Secure API Key Handling:** OpenRouter API key strictly on the backend, never exposed to the client.
    *   **HTTPS:** All communication between client, frontend server, backend server, and external services (OpenRouter, database) must be over HTTPS/TLS.
    *   **Input Validation:**
        *   Client-side: Basic form validation.
        *   tRPC procedures: Zod schemas for rigorous input validation of all data received from the client.
        *   Elixir backend: Ecto changesets for database-level validation and controller-level validation of parameters.
    *   **Cross-Site Scripting (XSS) Prevention:**
        *   React inherently escapes content rendered in JSX.
        *   Careful handling of any `dangerouslySetInnerHTML`.
        *   Sanitize Markdown output if the library doesn't do it by default or allows unsafe HTML.
    *   **Cross-Site Request Forgery (CSRF) Protection:** If cookie-based authentication is used for the Elixir backend API, Phoenix provides built-in CSRF protection mechanisms that should be enabled. For token-based auth (e.g., Bearer tokens), CSRF is less of a concern for the API itself.
    *   **Content Security Policy (CSP):** Implement a strict CSP header to mitigate XSS and other injection attacks.
    *   **Rate Limiting:** Implement rate limiting on the Elixir backend API endpoints (especially those hitting OpenRouter or performing heavy DB operations) based on IP address or `userID` (if authenticated).
    *   **Data Encryption:**
        *   **In Transit:** HTTPS/TLS for all network communication.
        *   **At Rest:** Utilize database-level encryption features provided by the managed PostgreSQL service (e.g., Transparent Data Encryption - TDE) or OS-level disk encryption.
    *   **Dependency Security:** Regularly scan dependencies (npm, Hex) for known vulnerabilities using tools like `npm audit` / `yarn audit` and `mix hex.audit`.
    *   **Authentication Security (if implemented):** Secure password hashing, protection against brute-force attacks, secure token handling.

## 4. Non-Functional Requirements

### 4.1. Performance
    *   **P-Initial Page Load (FCP/LCP):** First Contentful Paint (FCP) < 1.8 seconds, Largest Contentful Paint (LCP) < 2.5 seconds for main chat interface on a simulated average mobile device with a decent connection. Leverage Next.js ISR/SSR and code splitting.
    *   **P-AI Stream Latency:** Perceptible delay from AI starting to respond (first token received by Vercel AI SDK) to text appearing on screen < 300ms.
    *   **P-Session Switch Time:** Loading messages for an existing session and rendering them < 500ms (leveraging React Query cache and Dexie.js hydration).
    *   **P-UI Interaction Latency:** UI interactions (typing, button clicks, opening sidebar) should feel instant, with visual feedback within < 100ms.
    *   **P-tRPC API Response Times:** Non-streaming tRPC calls (e.g., fetching session list, CRUD operations) should have a P95 server response time < 200ms under normal load.
    *   **P-Database Query Times:** P95 for common PostgreSQL queries < 50ms.

### 4.2. Scalability
    *   **S-Frontend:** Next.js applications deployed on Vercel are inherently scalable due to serverless functions and CDN.
    *   **S-Backend (Elixir/Phoenix):** The Elixir/Phoenix backend must be designed for horizontal scalability. This means stateless HTTP request handlers (or state managed externally if needed). Target handling 1,000s of concurrent users initially, with a clear path to scale to 10,000s.
    *   **S-Database (PostgreSQL):** The chosen managed PostgreSQL service should allow for easy scaling of resources (CPU, RAM, storage) and support read replicas if needed for read-heavy workloads.
    *   **S-OpenRouter Limits:** Application design must respect OpenRouter API rate limits and quotas.

### 4.3. Reliability & Availability
    *   **R-Uptime:** Target 99.95% uptime for production services (frontend, backend, database).
    *   **R-Error Rates:** Server-side API error rate (5xx) < 0.1%. Client-side unhandled JavaScript error rate < 0.05% of sessions.
    *   **R-Data Integrity & Durability:** No loss or corruption of user message or session data. Achieved through robust database transactions, backups, and careful error handling.
    *   **R-Graceful Degradation:** If a non-critical external service (e.g., a specific AI model via OpenRouter) is down, the application should degrade gracefully, informing the user, rather than crashing. If Dexie.js fails, core online functionality should still work.

### 4.4. Usability (as detailed in F2.5)
    *   **U-Learnability:** Users should be able to perform core tasks (start chat, send message, view history) within 1 minute of first use without instruction.
    *   **U-Efficiency:** Common tasks should be achievable with a minimal number of clicks/actions.
    *   **U-Satisfaction:** Users should report a positive and frustration-free experience (measured via feedback or surveys).

### 4.5. Maintainability
    *   **M-Code Quality:** Adherence to established coding standards and best practices for TypeScript/React and Elixir/Phoenix. Code should be well-commented, especially for complex logic.
    *   **M-Typesafety:** Leverage tRPC and TypeScript to maximize compile-time checks and reduce runtime errors.
    *   **M-Test Coverage:**
        *   Unit Test Coverage: >80% for critical backend logic (Elixir contexts/services) and frontend utility functions/hooks.
        *   Integration Test Coverage: Key API flows (tRPC procedures to backend controllers) and major UI component interactions.
    *   **M-Modularity:** Frontend components and backend modules should be loosely coupled and highly cohesive. Clear separation of concerns.
    *   **M-Documentation:** Internal technical documentation for complex architectural decisions, API contracts (though tRPC reduces need for separate API docs), and setup procedures.
    *   **M-Onboarding Time:** A new developer should be able to understand the codebase and make meaningful contributions within 1-2 weeks.

### 4.6. Extensibility
    *   The architecture must easily accommodate future features:
        *   Adding new tRPC procedures for new functionalities.
        *   Integrating new AI models via OpenRouter by modifying backend configuration/logic.
        *   Introducing a full user authentication system.
        *   Adding new settings or UI themes.

## 5. Future Considerations / Potential Enhancements (Post V1.0)
*   **Full User Authentication & Accounts:** As detailed in F2.4.
*   **Cross-Device Real-time Synchronization:** Beyond React Query polling, using Phoenix Channels for instant updates if a session is modified on another device by the same user.
*   **Conversation Sharing:** Generate unique, shareable links (read-only or collaborative) for specific chat sessions.
*   **Selectable AI Models:** UI for users to choose different AI models available through OpenRouter for their conversations.
*   **Advanced Search:** Search within the content of the current session, or across all user sessions.
*   **Session Organization:** Folders, tags, or pinning for better management of numerous sessions.
*   **Customizable System Prompts:** Allow users to define custom system prompts per session or globally.
*   **Voice Input & Output:** Integrate speech-to-text for input and text-to-speech for AI responses.
*   **Plugin/Tool Integration for AI:** If models support tool use, integrate this capability.
*   **Team/Workspace Features:** Collaborative chat, shared session libraries for teams.
*   **Monetization:** Premium tiers for advanced features, higher usage limits, access to more powerful models.
*   **Offline Mode:** Enhanced offline capabilities beyond just viewing, potentially queuing messages for sending when back online (requires careful conflict resolution design).
*   **Image/File Support:** Allow users to upload images or files as part of their prompts, and for AI to potentially generate/reference them.

## 6. Out of Scope (for Version 1.0)
*   Full user authentication system with social logins (V1.0 might be anonymous or use a very simple local identifier).
*   Any multi-modal input/output beyond text (e.g., no image uploads, no audio file processing in V1.0).
*   Real-time multi-user collaboration *on the same chat session simultaneously*.
*   Advanced administrative dashboards or detailed user analytics.
*   Public API for third-party developer integrations.
*   In-app purchases or complex subscription management infrastructure (V1.0 is free or has a very simple access model).
*   Support for languages other than English (internationalization/localization).
*   Offline editing or creation of new messages.

---

This comprehensive PRD should provide a very solid foundation for building NexusChat. Remember that a PRD is a living document and may evolve as the project progresses and new insights are gained.