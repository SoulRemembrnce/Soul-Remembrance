---
name: Retreat group chat data model
description: How retreat group chats work — collection, access control, ID scheme, and screen architecture
---

## Collection: `groupChats/{chatId}`

Chat ID scheme: `retreat_{practitionerId}_{serviceId}` — all bookings of the same retreat service share one chat doc.

Key fields:
- `memberUids: string[]` — Firebase Auth UIDs of all who have booked; Firestore rules gate all read/write on this array
- `memberNames: Record<uid, string>` and `memberInitials: Record<uid, string>` — used to display sender info without extra reads
- `unreadCounts: Record<uid, number>` — per-user unread badge, reset via `markGroupChatRead`
- `avatarColor: [string, string]` — LinearGradient colors from the practitioner

Sub-collection: `groupChats/{chatId}/messages/{msgId}` — includes `senderName` and `senderInitials` so the UI can display them without extra lookups.

## Trigger

`FSService.isRetreat?: boolean` — practitioners toggle this when creating/editing a service in manage-services. When a retreat service is booked (`handleConfirmBooking` in `practitioner/[id].tsx`), `createOrJoinRetreatChat` is called instead of `createConversation`.

## Screen: `app/group-chat/[id].tsx`

Registered in `_layout.tsx` as `group-chat/[id]`. Uses `subscribeGroupChats(userId, ...)` to find its own chat doc (not a direct getDoc) so it stays reactive to member changes.

## Messages tab

`messages.tsx` subscribes to both `subscribeConversations` and `subscribeGroupChats` in parallel, shows "Retreat Chats" section (gold) above "Direct Messages" section (purple) when both exist.

**Why:** Separating sections makes the distinction clear; unread counts aggregate across both types in the header badge.
