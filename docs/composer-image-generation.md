# Composer Image Generation Integration

## Overview

Integrates product image generation directly into the composer media section with a minimal, inline UI optimized for discoverability and one-click usage.

## Design Philosophy

- **Minimal UI**: Flat, inline form - no modals or dialogs
- **Low Friction**: Tab-based interface feels lightweight and experimental
- **High Discoverability**: Generation option visible as a tab alongside Upload
- **One-Click Ready**: Studio mode requires only product selection + generate
- **Progressive Disclosure**: Advanced options hidden by default

## Architecture

### Component Structure

```
MediaSection (existing)
├── MediaSection.Header
├── MediaTabs (NEW)
│   ├── Upload Tab
│   │   ├── MediaSectionUpload
│   │   └── MediaSectionGallery
│   └── Generate Tab (NEW)
│       ├── MediaGenerateContent (NEW)
│       └── MediaSectionGallery (shared)
└── MediaSection.Dialogs
```

### New Files

```
packages/dash/ui/src/components/composer/media/
├── media-tabs.tsx                 (NEW - tab wrapper component)
├── media-generate-content.tsx     (NEW - generation form UI)
├── media-product-select.tsx       (NEW - reusable product selector)
├── media-style-select.tsx         (NEW - reusable style selector)
└── media-upload.tsx               (MODIFY - wrap with tabs)
```

## User Flow

### Studio Mode (Default - Minimal Friction)
```
1. Click "Generate" tab
2. Select product from dropdown
3. Click "Generate Image" button
4. Image appears in gallery below
```

### Styled Mode (One Extra Step)
```
1. Click "Generate" tab
2. Select product from dropdown
3. Toggle to "Styled" mode
4. Select style or paste reference URL
5. Click "Generate Image" button
6. Image appears in gallery below
```

## UI Specification

### Tab Layout

```
┌─────────────────────────────────────────────────────────┐
│ Share photos and videos                                 │
│ ┌──────────┬─────────────────┐                         │
│ │ Upload ✓ │ Generate ✨     │                         │
│ └──────────┴─────────────────┘                         │
│ [Tab Content Area]                                      │
└─────────────────────────────────────────────────────────┘
```

### Generation Form (Minimal)

```tsx
┌──────────────────────────────────────────────┐
│  Product                                     │
│  [Select product... ▾]           [Preview]  │
│                                               │
│  Mode                                         │
│  [ • Studio ]  [ ○ Styled ]                  │
│                                               │
│  [✨ Generate Image]                         │
│                                               │
│  Advanced options ▾                          │
└──────────────────────────────────────────────┘
```

### Smart Defaults

- **Mode**: Studio (most common, zero config)
- **Batch Count**: 1 (keep simple, users can generate more)
- **Prompt**: Empty (optional for customization)
- **Style Selection**: Only shown in Styled mode

## Technical Implementation

### State Management

```typescript
// Use existing composer store, no new store needed
const { uploadAttachments } = useComposerStore();

// After generation succeeds:
const handleGenerationSuccess = async (response) => {
  // Convert generated URLs to attachment specs
  const attachmentSpecs = await convertUrlsToAttachments(response.outputImages);
  
  // Add to composer using existing method
  addAttachments(attachmentSpecs);
  
  // Success feedback
  toast.success("Image added to composer");
};
```

### API Integration

Reuse existing hooks:
- `useProductListQuery()` - Fetch products
- `useStylesListQuery()` - Fetch styles (lazy load)
- `useProductImageGenerateMutation()` - Generate images

### Attachment Flow

```
Generate API Call
  ↓
Response with image URLs
  ↓
Fetch as Blobs (or use presigned URLs)
  ↓
Convert to SharedAttachmentSpec
  ↓
Add to composer.contentCreateData.base.attachments
  ↓
Sync to platform placements
  ↓
Show in gallery
```

## Visual Design

### Color & Spacing
- Use existing composer card styling
- Compact vertical rhythm: `space-y-3`
- Border radius: match existing `rounded-lg`
- Generate button: Primary accent color

### Typography
- Labels: `text-xs font-medium text-muted-foreground`
- Buttons: `text-sm font-medium`
- Hints: `text-xs text-muted-foreground`

### Icons
- Tab icon: `Sparkles` (✨)
- Studio mode: `Camera`
- Styled mode: `Palette`
- Generate button: `Sparkles`

## Discoverability Strategy

1. **Tab Visibility**: "Generate" tab with sparkle icon catches attention
2. **Empty State**: When no media, show hint: "Upload files or generate from products"
3. **Natural Position**: Right next to Upload tab
4. **First Visit**: Optional "New" badge or tooltip

## Performance Optimizations

- Lazy load styles only when "Styled" mode selected
- Prefetch products on tab focus
- Optimistic UI - show loading state while generating
- Debounce product search if implementing search

## Error Handling

- Validation: Disable generate button if required fields empty
- API Errors: Toast notification, don't close form
- Network Issues: Retry mechanism with exponential backoff
- File Limit: Check remaining slots before generating

## Success Metrics

- Time from opening composer to having usable image
- % of posts that use generated images
- Conversion rate: users who try generation vs. stick with upload
- Error rate and abandonment rate

## Future Enhancements

- Multi-select products for batch generation
- Save favorite product + style combinations
- Preview multiple variations before adding
- Drag generated images to reorder before adding
- Quick regenerate with same settings

## Implementation Phases

### Phase 1: Core Functionality ✅
- [x] Create tab wrapper component (`media-tabs.tsx`)
- [x] Build minimal generation form (`media-generate-content.tsx`)
- [x] Wire up product selection
- [x] Implement studio mode generation
- [ ] Add generated images to composer attachments (TODO: convert URLs to attachments)

### Phase 2: Styled Mode ✅
- [x] Add mode toggle UI
- [x] Implement style selection
- [x] Add reference URL input (in advanced options)
- [x] Handle styled generation

### Phase 3: Polish ✅
- [x] Advanced options (collapsible)
- [x] Loading states and feedback
- [x] Error handling and validation
- [ ] Empty state hints (TODO: add when no products)
- [ ] Accessibility improvements (TODO: keyboard navigation)

### Phase 4: Optimization (Next)
- [ ] Connect generated images to composer attachments
- [ ] Performance tuning
- [ ] Analytics tracking
- [ ] User testing and iteration
- [ ] Documentation and help text

## Current Status

**Scaffolding Complete ✅**

Files created:
- `media-tabs.tsx` - Tab wrapper with Upload/Generate tabs
- `media-generate-content.tsx` - Minimal generation form UI
- `media-upload.tsx` - Modified to use tabs

**Next Steps:**
1. Implement attachment conversion logic (URLs → SharedAttachmentSpec)
2. Hook up generated images to composer store
3. Test the full flow end-to-end
4. Add empty state messaging
5. Polish accessibility and keyboard navigation
