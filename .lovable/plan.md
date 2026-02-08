

## Add Full-Screen Chat Page with Persistent Conversations

### Overview

Add a dedicated Chat page (ChatGPT-style) in the sidebar with conversation persistence. Conversations started in the floating chatbot widget will also be saved and visible on this page. The page features a sidebar of past conversations, the ability to start new chats, and full message history stored in the database.

### Database

Two new tables:

**`chat_conversations`** -- stores each conversation thread
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, not null) -- references the authenticated user
- `title` (text, default 'New Chat') -- auto-generated from first message
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**`chat_messages`** -- stores individual messages within a conversation
- `id` (uuid, PK, default gen_random_uuid())
- `conversation_id` (uuid, not null, FK to chat_conversations.id ON DELETE CASCADE)
- `role` (text, not null) -- 'user' or 'assistant'
- `content` (text, not null)
- `created_at` (timestamptz, default now())

RLS policies:
- Users can only SELECT, INSERT, UPDATE, DELETE their own conversations
- Users can only SELECT, INSERT their own messages (via join to conversations)

### New Files

**`src/pages/Chat.tsx`** -- Full-screen chat page
- Left panel: scrollable list of past conversations with titles and timestamps, "New Chat" button at top
- Main panel: full-height message area with markdown rendering (reusing the same ReactMarkdown + remarkGfm setup as the floating widget)
- Bottom input bar with send button
- On selecting a conversation, loads its messages from `chat_messages`
- On sending a message, saves it to the database, streams the response via `openclaw-chat`, and saves the assistant reply when done
- Auto-generates conversation title from the first user message (truncated to ~50 chars)
- Responsive: on mobile, conversation list becomes a collapsible drawer

**`src/hooks/useChatConversations.ts`** -- React hook for conversation CRUD
- `fetchConversations()` -- loads all conversations for the user, ordered by `updated_at` desc
- `createConversation(title)` -- inserts a new conversation row
- `deleteConversation(id)` -- deletes a conversation (cascades messages)
- `renameConversation(id, title)` -- updates the title
- `fetchMessages(conversationId)` -- loads all messages for a conversation
- `saveMessage(conversationId, role, content)` -- inserts a message and updates `updated_at` on the conversation

### Modified Files

**`src/components/dashboard/Sidebar.tsx`** -- Add "Chat" nav item between "Network" and "Moltbook" with `MessageCircle` icon pointing to `/chat`

**`src/App.tsx`** -- Add `/chat` route inside the authenticated dashboard layout

**`src/components/dashboard/OpenClawChat.tsx`** -- Update the floating widget to also persist messages:
- When sending a message from the widget, save it to a "widget" conversation in the database
- When receiving a complete assistant response (`onDone`), save it too
- This way, conversations started in the widget appear on the Chat page

### Chat Page Layout

```text
+---------------------+---------------------------------------------+
| Conversations       |  Chat Title                                 |
|---------------------|---------------------------------------------|
| [+ New Chat]        |                                             |
|                     |  [user bubble]     "hello, who are..."      |
| > Today             |                                             |
|   Krump History     |  [assistant bubble] "Yo! Krump was..."      |
|   Dance Moves       |                                             |
|                     |                                             |
| > Yesterday         |                                             |
|   Token Transfer    |                                             |
|                     |                                             |
|                     |---------------------------------------------|
|                     |  [input]                         [Send]     |
+---------------------+---------------------------------------------+
```

### Message Flow

1. User types a message and hits send
2. Message is saved to `chat_messages` with role='user'
3. Full conversation history is sent to `openclaw-chat` edge function for streaming
4. Tokens stream in and render progressively (same as floating widget)
5. When streaming completes (`onDone`), the full assistant response is saved to `chat_messages` with role='assistant'
6. The conversation's `updated_at` is bumped, and the title is auto-set from the first user message if it's still "New Chat"

### Technical Details

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | `chat_conversations` and `chat_messages` tables with RLS |
| `src/hooks/useChatConversations.ts` | Create | Hook for conversation and message CRUD |
| `src/pages/Chat.tsx` | Create | Full-screen ChatGPT-style chat page |
| `src/components/dashboard/Sidebar.tsx` | Edit | Add "Chat" nav item |
| `src/App.tsx` | Edit | Add `/chat` route |
| `src/components/dashboard/OpenClawChat.tsx` | Edit | Persist widget messages to database |

No new dependencies required -- reuses existing ReactMarkdown, remarkGfm, framer-motion, and the `streamChat` helper from `@/lib/openclaw-stream`.

