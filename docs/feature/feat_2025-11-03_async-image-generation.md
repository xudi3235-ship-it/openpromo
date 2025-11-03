# Async Image Generation with Real-time Updates

**Date:** November 3, 2025  
**Status:** ✅ Implemented  
**Feature:** Convert image generation from blocking HTTP to async workflow with WebSocket updates

## Problem Statement

Current image generation uses a single blocking HTTP request that takes 30s-1min to complete. This causes:
- Poor UX (user waits with no feedback)
- Connection timeout risk
- No granular status updates
- Cannot batch multiple generations efficiently

## Solution Overview

Move image generation to an async workflow pattern with real-time WebSocket updates via the existing workspace event system.

## Architecture

### Current Flow (Blocking)
```
User clicks "Generate"
  ↓
POST /api/product/image-generate (blocks for 30-60s)
  ↓
Returns completed images
  ↓
Update UI
```

### New Flow (Async + WebSocket)
```
User clicks "Generate"
  ↓
POST /api/product/image-generate (returns immediately)
  ↓
Returns: { generationIds: ["gen_123", "gen_456"] }
  ↓
Show optimistic "pending" cards in gallery
  ↓
WebSocket Event: { state: "generating", generationId: "gen_123" }
  ↓
Update badge to "Generating..."
  ↓
WebSocket Event: { state: "completed", outputImages: [...] }
  ↓
Fade in actual image
```

## Implementation Plan

### 1. Backend Changes

#### 1.1 Update Image Generation Workflow

The workflow already exists and `EntImageGeneration` already has `dispatchUpdateEvent()`. We need to:

1. **Call `dispatchUpdateEvent()` at each state transition:**

```typescript
// In image generation workflow
async function generateImageWorkflow(input: ProductImageGenerateInput) {
  // Create generation record immediately
  const generation = await EntImageGeneration.create({ 
    ...input,
    state: "pending",
    workspaceId: Actor.workspaceID(),
  });
  
  // Dispatch immediately - user sees "pending" state
  await generation.dispatchUpdateEvent();
  
  try {
    // Update to generating
    await generation.updateState("generating");
    await generation.dispatchUpdateEvent(); // ← User sees "generating"
    
    // Do the actual generation...
    const result = await generateProductImage(input);
    
    // Update to completed with images
    await generation.updateState("completed", result.images);
    await generation.dispatchUpdateEvent(); // ← User sees completed image
    
  } catch (error) {
    await generation.updateState("failed", null, error.message);
    await generation.dispatchUpdateEvent(); // ← User sees error
    throw error;
  }
  
  return generation;
}
```

2. **Update API endpoint to return immediately:**

```typescript
// POST /api/product/image-generate
async function handleProductImageGenerate(input: ProductImageGenerateInput) {
  // Start workflow (don't await completion)
  const generation = await triggerImageGenerationWorkflow(input);
  
  // Return immediately with generation ID
  return {
    generationId: generation.id,
    state: generation.state, // "pending"
  };
}
```

#### 1.2 Event Schema (Already Exists!)

The event schema is already defined in `packages/shared/src/workspace/events.ts`:

```typescript
export const ImageGenerationUpdatedEventSchema = z.object({
  type: z.literal("image_generation.updated"),
  generationId: z.string(),
  state: z.enum(["not_started", "pending", "generating", "completed", "failed"]),
  stateMessage: z.string().nullable().optional(),
  outputImages: z.array(z.string()).optional(),
  timestamp: z.number(),
});
```

**No changes needed** - this schema already supports what we need!

### 2. Frontend Changes

#### 2.1 Update `GeneratedImagesGallery` Component

Add WebSocket event listener to receive real-time updates:

```tsx
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";

export function GeneratedImagesGallery({ generateMutation, remainingSlots }: Props) {
  const { data, refetch } = useImageGenListQuery({ page: "1", pageSize: "12" });
  
  // Listen for image generation updates via WebSocket
  useWorkspaceEvents({
    handlers: {
      "image_generation.updated": (event) => {
        console.log("Image generation update:", event);
        
        // Option A: Simple refetch (easiest to implement)
        refetch();
        
        // Option B: Optimistic local update (smoother UX)
        // updateGenerationInCache(event.generationId, {
        //   state: event.state,
        //   outputImages: event.outputImages,
        //   stateMessage: event.stateMessage,
        // });
      },
    },
  });
  
  // Rest of component...
}
```

#### 2.2 Update Generate Mutation

Change from blocking to immediate return:

```tsx
// Before (blocking):
const generateMutation = useMutation({
  mutationFn: async (input) => {
    const result = await api.post("/product/image-generate", input);
    return result.data; // Waits 30-60s
  },
});

// After (async):
const generateMutation = useMutation({
  mutationFn: async (input) => {
    const result = await api.post("/product/image-generate", input);
    return result.data; // Returns immediately with generationId
  },
  onSuccess: (data) => {
    // Show optimistic pending card
    // Real updates will come via WebSocket
    toast.success("Generation started!");
  },
});
```

#### 2.3 Update `GenerationCard` Component

The card already handles different states. Ensure it shows:
- `pending`: Spinner + "Queued..."
- `generating`: Spinner + "Generating..."
- `completed`: Actual image (fade in)
- `failed`: Error badge + message

**Minimal changes needed** - current implementation already supports this!

### 3. User Experience Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. User clicks "Generate"                           │
│    → Button shows spinner                           │
│    → POST returns immediately                       │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. Optimistic pending card appears                  │
│    ┌─────────────┐                                  │
│    │ [spinner]   │                                  │
│    │  Queued...  │                                  │
│    └─────────────┘                                  │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. WebSocket: state="generating"                    │
│    ┌─────────────┐                                  │
│    │ [spinner]   │                                  │
│    │ Generating..│                                  │
│    └─────────────┘                                  │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. WebSocket: state="completed" + images            │
│    ┌─────────────┐                                  │
│    │ [✓ image]   │ ← Fade in animation             │
│    │             │                                  │
│    └─────────────┘                                  │
└─────────────────────────────────────────────────────┘
```

### 4. Benefits

✅ **Immediate feedback** - User doesn't wait for generation to complete  
✅ **Real-time progress** - Shows "queued" → "generating" → "completed"  
✅ **No timeouts** - HTTP request returns immediately  
✅ **Better reliability** - WebSocket handles reconnection automatically  
✅ **Scalable** - Can batch multiple generations  
✅ **Cross-tab updates** - All open tabs see updates  
✅ **Background generation** - User can navigate away and come back

### 5. Existing Infrastructure (Already Built!)

We already have all the pieces:

- ✅ `WorkspaceWebSocketProvider` - Single WebSocket per workspace
- ✅ `useWorkspaceEvents` - Type-safe event handling hook
- ✅ `ImageGenerationUpdatedEvent` - Event schema defined
- ✅ `EntImageGeneration.dispatchUpdateEvent()` - Backend dispatch method
- ✅ `dispatchWorkspaceEvent()` - Pusher integration
- ✅ Automatic reconnection handling

**No new infrastructure needed!**

### 6. Fallback Strategy (Optional Enhancement)

While WebSocket is primary, we can add polling as a fallback:

```tsx
useEffect(() => {
  if (!pendingGenerationIds.length) return;
  
  // If no WebSocket update in 15s, start polling
  const pollTimer = setTimeout(() => {
    const pollInterval = setInterval(() => {
      refetch();
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, 15000);
  
  return () => clearTimeout(pollTimer);
}, [pendingGenerationIds]);
```

**Decision:** Start without polling, add only if needed.

## Implementation Checklist

### Backend
- [x] Update image generation workflow to dispatch events at each state
- [x] Modify API endpoint to return immediately with generationId
- [x] Add environment flag (VITE_ENVIRONMENT) for local vs production
- [ ] Test event dispatching in development
- [ ] Verify Pusher events reach clients

### Frontend
- [x] Add `useWorkspaceEvents` to `GeneratedImagesGallery`
- [x] Update generate mutation to handle async response
- [x] Add success messages for both sync/async modes
- [ ] Test WebSocket event handling
- [ ] Handle edge cases (disconnection, errors)
- [ ] Update loading states and animations

### Testing
- [ ] Test generation flow end-to-end (local sync mode)
- [ ] Test generation flow end-to-end (production async mode)
- [ ] Verify events fire correctly at each state
- [ ] Test with multiple concurrent generations
- [ ] Test WebSocket reconnection scenarios
- [ ] Test cross-tab updates
- [ ] Load test with multiple users

## Implementation Summary

### What Was Implemented

**Backend (`packages/dash/worker/src/routes/api/workspaces/image-gen/index.ts`):**
- Added environment check using `env.VITE_ENVIRONMENT === "local"`
- **Local mode:** Uses existing sync generation (blocks until complete)
- **Production mode:** Creates generation records, triggers workflow, returns immediately
- Response includes `async: true/false` flag to indicate mode

**Workflow (`packages/core/src/domain/image-generation/workflows/image-generation-workflow.ts`):**
- Added `dispatchUpdateEvent()` calls at each state transition:
  - After marking as "generating"
  - After completion (with output images)
  - After failure (with error message)
- Updated workflow comments to reflect WebSocket integration

**Frontend (`packages/dash/ui/src/components/composer/media/generator-dialog/progress-panel.tsx`):**
- Added `useWorkspaceEvents` hook
- Listens for `"image_generation.updated"` events
- Refetches generation list when events received

**Frontend (`packages/dash/ui/src/queries/product.ts`):**
- Updated mutation success handler to check for `async` flag
- Shows appropriate toast message for sync vs async modes

### Migration Strategy

✅ **Phase 1 Complete:** Implemented with environment flag
- Local development continues to use sync generation (no breaking changes)
- Production can be switched by setting `VITE_ENVIRONMENT` !== "local"

**Next Steps:**
1. Test in local environment (sync mode)
2. Deploy to staging with async mode enabled
3. Monitor WebSocket events and generation flow
4. If stable, enable in production

## Open Questions

- [ ] Should we show a progress percentage if available?
- [ ] How long should we keep completed generations in the list?
- [ ] Should we add notifications for completed generations when user is on another page?
- [ ] Do we want to support canceling in-progress generations?

## References

- Event Schema: `packages/shared/src/workspace/events.ts`
- WebSocket Hook: `packages/dash/ui/src/hooks/useWorkspaceWebSocket.tsx`
- Entity: `packages/core/src/domain/image-generation/EntImageGeneration.ts`
- Component: `packages/dash/ui/src/components/composer/media/generator-dialog/progress-panel.tsx`
