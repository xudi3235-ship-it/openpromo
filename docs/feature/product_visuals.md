## Product Visuals (v2) UI/UX

### Goals
- Single, simple surface for creating product visuals (images or short videos) without exposing “agents” to users.
- Left/right split: inputs on the left, outputs on the right.
- Minimal UI (bordered panels, no heavy chrome), content-forward.
- Reuse existing `VideoGenRealtime` shapes from `@shared` for inputs/artifacts/status.
- Reuse Zustand for state.

### State (Zustand)
- `mode`: `"image"` | `"video"`.
- Inputs (aligned to `VideoGenRealtime.Input`):
  - `prompt` (string)
  - `productImageUrls: string[]`
  - `avatarImageUrls: string[]`
  - `referenceImageUrls: string[]`
  - `brandAssetUrls: string[]`
- Connection/status: `isConnected`, `status` (uses `VideoGenRealtime.RunStatus`).
- Live artifacts: `{ images: {id,imageUrl}[], videos: {id,videoUrl}[] }` (from `VideoGenRealtime` output/artifacts).
- Runs feed: list of past runs (images/videos) from existing query.

### Layout

**Top bar**
- Title: “Product Visuals”.
- Description: “Create product imagery or short videos.”
- Right side: connection badge + status pill + mode toggle (Images / Video). No “agent” wording.

**Left panel (Inputs)**
- Bordered card, no heavy shadow.
- Fields (map to `VideoGenRealtime.Input`):
  - Prompt/instructions (textarea, helper text).
  - Product selector (reuse v1 dropdown) that autofills product image URLs from attachments; allow manual override.
  - Product image URLs (textarea, one per line) populated by the selector.
  - Avatar assets (optional): drag-and-drop area + URL input (no dropdown).
  - Reference/style assets (optional): drag-and-drop area + URL input (no dropdown).
  - Brand assets (optional): drag-and-drop area + URL input (no dropdown).
- “Generate {Image/Video}” button.
- Inline error if generation fails.
- Inputs sync to store; Generate triggers a single start action.

**Right panel (Outputs)**
- Header: “Outputs”.
- Live artifacts (if any): grid of current images/videos; videos autoplay muted; minimal chrome.
- Runs gallery: masonry-ish grid; each card shows cover (video autoplay or first image), prompt snippet, status badge, timestamp; minimal borders.
  - Each run card includes an actions dropdown (separate action file/component) for open/download/copy link (and future delete/share).

**Modal (on card click)**
- Two-column modal:
  - Left: list of all artifacts for that run (thumbnails or small video previews).
  - Right: final outputs (for image runs, final images; for video runs, final video).
  - Metadata: prompt, mode, status, created time; links to open/download.

### Behavior
- Mode toggle only changes label and target mode; inputs stay the same (they map to `VideoGenRealtime.Input`).
- Live artifacts render whatever streams in; on completion, show final outputs (image: last images; video: completed video).
- No “agent” wording; just Inputs/Generate/Outputs.

### Open Questions
- Pagination/infinite scroll on runs gallery?
- Expose delete actions or keep gallery read-only?
