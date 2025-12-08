# Development Guide

## Turborepo Setup

This monorepo uses **Turborepo** for efficient task execution across all packages with intelligent caching.

### Installation

Turborepo is already installed as a dev dependency. If you need to reinstall:

```bash
pnpm add turbo --save-dev --workspace-root
```

### Common Commands

Run tasks across all packages:

```bash
# Type-check all packages
pnpm turbo typecheck

# Run linting
pnpm turbo lint

# Run biome check
pnpm turbo check

# Build all packages
pnpm turbo build

# Start development mode (all packages)
pnpm turbo dev

# Run tests
pnpm turbo test
```

### Filtering & Specific Packages

Run tasks for a single package:

```bash
# Run typecheck only for @openpromo/dash
pnpm turbo typecheck --filter=@openpromo/dash

# Run a task for a package and its dependencies
pnpm turbo typecheck --filter=@openpromo/dash...

# Run for all packages matching a pattern
pnpm turbo build --filter='./packages/*'
```

### Advanced Options

```bash
# Dry-run to see what would execute
pnpm turbo build --dry

# Run without caching
pnpm turbo build --cache=local:r,remote:r

# Watch mode (rebuild on file changes)
pnpm turbo build --watch

# Show execution graph
pnpm turbo build --graph
```

### Monorepo Packages

- `@openpromo/core` — Core backend/database logic
- `@openpromo/dash` — Dashboard UI
- `@openpromo/scripts` — Utility scripts
- `@openpromo/shared` — Shared types and utilities
- `@openpromo/ui` — UI component library
- `www` — Marketing website

---

## FAQs

1. **OAuth Login**: TikTok local dev login does not work. We use Cloudflare Zero Trust tunnel, works the same as ngrok but free.
