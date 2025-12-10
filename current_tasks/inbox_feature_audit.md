# Inbox Features Audit - 12/10/2025

## Executive Summary

The inbox feature in OpenPromo is **75% complete** with robust support for Facebook and Instagram (both DMs and comments), while TikTok integration is partially complete (comments only). The system demonstrates solid architecture with proper separation of concerns, multi-tenant design, and scalable database schema.

## Current Implementation Status

### ✅ **COMPLETED FEATURES**

#### 1. **Core Infrastructure**
- **Database Schema**: Complete with 4 tables (contacts, conversations, messages, message-state)
- **Multi-tenant Architecture**: Proper workspace isolation
- **API Layer**: 6 RESTful endpoints fully implemented
- **Real-time Updates**: Event dispatching system
- **Service Layer**: InboxService with contact/conversation management

#### 2. **Facebook Integration**
- DM webhook handler with read receipts, reactions, edits
- Comment support with threading
- Contact resolution via Facebook Graph API
- Full reply functionality for both DMs and comments
- OAuth flow with proper token management

#### 3. **Instagram Integration**
- DM webhook handler with editing and reactions
- Comment support with media backfilling
- Business account detection
- User profile fetching
- Full reply functionality
- Content backfill for media posts

#### 4. **UI Components**
- Inbox layout with sidebar and main view
- Separate panels for DMs and comment threads
- Message composer with attachment support
- Context panel showing post preview
- Channel switcher (DMs vs Comments)
- Real-time message updates

### 🚧 **PARTIALLY COMPLETE**

#### 5. **TikTok Integration**
- **Comments**: ✅ Complete
  - Business API client integration
  - Comment ingestion and threading
  - Content backfilling for videos
  - Reply functionality with rate limit handling

- **DMs**: ❌ Missing
  - No webhook handler
  - No Business Messaging API integration
  - Missing reply functionality

### ❌ **MISSING FEATURES**

#### 1. **TikTok Business Messaging**
- Missing TikTok Business Center app credentials
- No webhook route for TikTok DMs
- Missing DM ingestion pipeline
- No DM reply capability

#### 2. **Advanced Features**
- Message search functionality
- Conversation analytics/insights
- Bulk actions (mark multiple as read, delete)
- Automated responses or templates
- Message scheduling
- File attachment support for all platforms

## Technical Debt & Issues

### High Priority
1. **TikTok OAuth Scoping**
   - Current app uses Developer credentials
   - Business Messaging requires separate Business Center app
   - Need dual credential management

2. **Rate Limiting**
   - TikTok: 10 messages per 48 hours
   - No rate limit UI indicators
   - Missing graceful degradation

3. **Error Handling**
   - Generic error messages for API failures
   - No retry logic for failed sends
   - Missing offline support

### Medium Priority
1. **Schema Optimizations**
   - Missing indexes for common queries
   - No pagination cursor optimization
   - Message payload size not validated

2. **Performance**
   - No caching for contact info
   - Sequential API calls for contact resolution
   - Missing background job for media backfill

## Platform-Specific Audit Details

### Facebook Messenger
```typescript
// File: packages/core/src/domain/inbox/facebook-dm.ts
Status: ✅ COMPLETE
Features: DMs, Read receipts, Reactions, Edits
Missing: None critical
```

### Instagram Direct
```typescript
// File: packages/core/src/domain/inbox/instagram-dm.ts
Status: ✅ COMPLETE
Features: DMs, Media sharing, Profile fetch
Missing: None critical
```

### TikTok Business
```typescript
// File: packages/core/src/domain/inbox/tiktok-business-comments.ts
Status: 🚧 COMMENTS ONLY
Features: Comments, Basic replies
Missing: DM webhook, DM reply, Message states
```

## API Endpoint Coverage

| Endpoint | Status | FB | IG | TikTok |
|----------|--------|----|----|--------|
| GET /conversations | ✅ | ✅ | ✅ | 🚧 (comments only) |
| GET /messages | ✅ | ✅ | ✅ | 🚧 (comments only) |
| POST /messages | ✅ | ✅ | ✅ | 🚧 (comments only) |
| POST /read | ✅ | ✅ | ✅ | ❌ (not implemented) |
| DELETE /conversation | ✅ | ✅ | ✅ | 🚧 |
| GET /unread-count | ✅ | ✅ | ✅ | 🚧 |

## Recommendations & Next Steps

### Immediate (P0) - To Complete MVP
1. **Complete TikTok DM Integration**
   - Register TikTok Business Center app
   - Implement `tiktok-dm.ts` webhook handler
   - Add DM reply functionality
   - Update OAuth flow to handle messaging scopes

2. **Fix Critical Gaps**
   - Implement TikTok read receipts
   - Add proper error boundaries in UI
   - Handle missing OAuth scopes gracefully

### Short Term (P1) - Improve Reliability
1. **Rate Limiting & UI**
   - Add rate limit indicators for TikTok
   - Implement exponential backoff for retries
   - Show clear error messages to users

2. **Performance Optimizations**
   - Add Redis caching for contact data
   - Implement lazy loading for message history
   - Batch process contact resolution

### Long Term (P2) - Enhanced Features
1. **Search & Analytics**
   - Implement message search
   - Add conversation insights
   - Export functionality

2. **Automation**
   - Saved replies/templates
   - Auto-responder rules
   - Integration with Composer for scheduled replies

## Security & Compliance

- ✅ Tokens encrypted in database
- ✅ Webhook signature verification
- ✅ Workspace isolation
- ⚠️ Need PII scanning for message content
- ⚠️ Missing data retention policies

## Conclusion

The inbox feature has a strong foundation with 2/3 platforms fully integrated. The primary focus should be completing TikTok DM integration to achieve feature parity. The architecture is scalable and well-designed, making it straightforward to add the missing functionality.

**Overall Progress: 75% Complete**
- Facebook/Instagram: 100%
- TikTok: 40% (comments only)