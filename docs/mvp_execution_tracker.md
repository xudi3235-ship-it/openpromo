# MVP Execution Tracker

## Priority Items for MVP Launch

### [P0] Critical Path Items

- **Complete TikTok Business Integration Refactor**
  - Simplify integration to use only TikTok Business API
  - Remove any dependencies on regular TikTok dev API
  - Verify access token lifecycle and expiration handling
  - Encrypt all access tokens, prevent client-side exposure

- **Implement One-Click Thumbnail Generation**
  - Add video thumbnail generation feature in Composer
  - Critical for video content workflow
  - Integrate with existing video processing pipeline

- **Secure OAuth Implementation**
  - Implement Zod schema validation for OAuth flows
  - Add observability with Posthog for OAuth events
  - Check and support IG with FB login flow
  - Implement periodic token refresh jobs for all platforms

### [P1] Core Feature Completion

- **Content Management Enhancements**
  - Build detail view for published posts with full metrics
  - Complete backfill audit and lifecycle management
  - Implement nightly metrics refresh for content table
  - Redesign planner week view with 20-min time intervals

- **Inbox DM + Comments Integration**
  - Complete TikTok Business messaging API integration
  - Audit feature parity across FB, IG, and TT
  - Ensure consistent DM and comment handling

- **GenAI Presets & Quality**
  - Add high-level presets in UI for image/video generation
  - Tune prompts to fix slow dialogue issues in UGC videos
  - Reverse-engineer top-performing ads and apply frameworks

- **Workspace Onboarding Flow**
  - Design and implement new user onboarding
  - Create workspace setup wizard
  - Add platform connection guidance

### [P2] Platform Foundations

- **Payments Infrastructure**
  - Research and decide between Stripe vs Polar.sh
  - Define pricing tiers based on market research
  - Implement payment processing and billing

- **Notification System**
  - Set up Resend for transactional emails
  - Design email templates for key events
  - Implement in-app notification system

- **Observability & Monitoring**
  - Evaluate and potentially add Sentry for error tracking
  - Verify Posthog e2e event flows
  - Set up dashboard for key metrics

### [P3] Marketing & Launch

- **WWW Site Revamp**
  - Redesign landing page with clear value proposition
  - Implement SEO optimization
  - Add pricing page and feature documentation

- **Dogfooding Social Media**
  - Run OpenPromo's own social channels using the platform
  - Create and publish content internally
  - Document all pain points and fix them

## Notes
- Focus on P0 items first as they block core functionality
- Each item should be broken down into sub-tasks when assigned
- Update status regularly during standups
- Items marked as critical launch blockers must be completed before public launch