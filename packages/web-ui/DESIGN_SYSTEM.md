# OpenPromo Design System

## Overview
This document outlines the standardized design system for OpenPromo's web UI components.

## Color System

### Semantic Colors
Use semantic color names that convey meaning:

```css
/* Success states */
--success: oklch(0.646 0.222 142.495)
--success-foreground: oklch(0.145 0 0)
--success-muted: oklch(0.961 0.013 142.495)
--success-border: oklch(0.922 0.047 142.495)

/* Warning states */
--warning: oklch(0.828 0.189 84.429)
--warning-foreground: oklch(0.145 0 0)
--warning-muted: oklch(0.981 0.031 84.429)
--warning-border: oklch(0.922 0.094 84.429)

/* Error states */
--error: oklch(0.577 0.245 27.325)
--error-foreground: oklch(0.985 0 0)
--error-muted: oklch(0.981 0.039 27.325)
--error-border: oklch(0.922 0.122 27.325)
```

### Neutral Scale
```css
--neutral-50: oklch(0.985 0 0)    /* Very light backgrounds */
--neutral-100: oklch(0.97 0 0)    /* Light backgrounds */
--neutral-200: oklch(0.922 0 0)   /* Borders, dividers */
--neutral-300: oklch(0.856 0 0)   /* Disabled states */
--neutral-400: oklch(0.708 0 0)   /* Placeholder text */
--neutral-500: oklch(0.556 0 0)   /* Secondary text */
--neutral-600: oklch(0.439 0 0)   /* Body text */
--neutral-700: oklch(0.322 0 0)   /* Headings */
--neutral-800: oklch(0.205 0 0)   /* Dark elements */
--neutral-900: oklch(0.145 0 0)   /* Very dark text */
--neutral-950: oklch(0.088 0 0)   /* Black text */
```

### Usage Guidelines
- Use `bg-success`, `text-error`, `border-warning` instead of hardcoded colors
- Use semantic names: `bg-success` not `bg-green-500`
- Neutral colors for text: `text-neutral-600` for body, `text-neutral-900` for headings

## Typography

### Hierarchy
```tsx
<Typography.Display>    // text-4xl md:text-5xl lg:text-6xl - Hero/Marketing
<Typography.Hero>       // text-3xl md:text-4xl - Hero sections  
<Typography.H1>         // text-2xl md:text-3xl - Page titles
<Typography.H2>         // text-xl md:text-2xl - Section titles
<Typography.H3>         // text-lg - Subsection titles
<Typography.H4>         // text-base - Card titles
<Typography.H5>         // text-sm - Small headings
<Typography.H6>         // text-xs uppercase - Overlines
```

### Body Text
```tsx
<Typography.BodyLg>     // text-lg - Large body text
<Typography.BodyBase>   // text-base - Regular body text
<Typography.BodySm>     // text-sm - Small body text
<Typography.Caption>    // text-xs - Captions, metadata
```

### Specialized
```tsx
<Typography.Label>      // text-sm font-medium - Form labels
<Typography.Overline>   // text-xs uppercase - Category labels
<Typography.Lead>       // text-xl - Introduction text
<Typography.Muted>      // text-sm muted - Secondary text
```

## Components

### Button Variants
```tsx
<Button variant="primary">     // Primary actions
<Button variant="secondary">   // Secondary actions  
<Button variant="outline">     // Tertiary actions
<Button variant="ghost">       // Minimal actions
<Button variant="destructive"> // Dangerous actions
<Button variant="success">     // Success actions
<Button variant="warning">     // Warning actions
<Button variant="link">        // Link-style buttons
```

### Button Sizes
```tsx
<Button size="xs">       // h-7 - Very small
<Button size="sm">       // h-8 - Small
<Button size="default">  // h-9 - Default
<Button size="lg">       // h-10 - Large
<Button size="xl">       // h-11 - Extra large
<Button size="icon">     // size-9 - Square icon
```

### Badge Variants
```tsx
<Badge variant="default">      // Primary brand color
<Badge variant="secondary">    // Neutral gray
<Badge variant="success">      // Green success
<Badge variant="warning">      // Yellow warning
<Badge variant="destructive">  // Red error
<Badge variant="outline">      // Outlined style
```

## Layout System

### Spacing Scale
```tsx
<Stack spacing="xs">     // gap-1 (4px)
<Stack spacing="sm">     // gap-2 (8px)  
<Stack spacing="md">     // gap-4 (16px) - default
<Stack spacing="lg">     // gap-6 (24px)
<Stack spacing="xl">     // gap-8 (32px)
<Stack spacing="2xl">    // gap-12 (48px)
<Stack spacing="3xl">    // gap-16 (64px)
```

### Container Sizes
```tsx
<Container size="sm">    // max-w-2xl
<Container size="md">    // max-w-4xl
<Container size="lg">    // max-w-6xl
<Container size="xl">    // max-w-7xl - default
<Container size="full">  // max-w-full
```

## Border Radius

### Scale
```css
--radius-xs: 0.125rem    /* 2px - small elements */
--radius-sm: 0.25rem     /* 4px - badges */
--radius-md: 0.375rem    /* 6px - inputs */
--radius-lg: 0.5rem      /* 8px - buttons, cards */
--radius-xl: 0.75rem     /* 12px - large cards */
--radius-2xl: 1rem       /* 16px - containers */
--radius-3xl: 1.5rem     /* 24px - large containers */
--radius-full: 9999px    /* Pills, avatars */
```

### Usage
- Buttons, inputs: `rounded-lg` (8px)
- Cards, modals: `rounded-xl` (12px)  
- Pills, badges: `rounded-full`
- Large containers: `rounded-2xl` (16px)

## Elevation (Shadows)

```css
--shadow-xs: /* Subtle depth */
--shadow-sm: /* Cards, dropdowns */
--shadow-md: /* Modals, popovers */
--shadow-lg: /* Overlays */
--shadow-xl: /* Large modals */
--shadow-2xl: /* Hero elements */
```

## Motion

```css
--duration-fast: 150ms     /* Micro-interactions */
--duration-normal: 200ms   /* Default transitions */
--duration-slow: 300ms     /* Complex animations */

--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in: cubic-bezier(0.4, 0, 1, 1)
```

## Focus States

### Utilities
```css
.focus-ring          /* Standard focus ring */
.focus-ring-inset    /* Inset focus ring */
.focus-ring-error    /* Error state focus */
.focus-ring-success  /* Success state focus */
```

## Best Practices

### Do ✅
- Use semantic color names (`bg-success` not `bg-green-500`)
- Use consistent spacing from the Stack component
- Follow typography hierarchy (Display > Hero > H1 > H2...)
- Use appropriate button variants for different actions
- Add proper focus states to interactive elements

### Don't ❌  
- Use hardcoded hex colors (`bg-[#ff0000]`)
- Mix different spacing scales in the same component
- Skip typography hierarchy levels
- Use primary buttons for destructive actions
- Forget accessibility attributes (alt, aria-*)

## Migration Guide

### Updating Colors
```tsx
// Before
className="bg-[var(--green-fill)] text-[var(--green-text)]"

// After  
<Badge variant="success">
```

### Updating Typography
```tsx
// Before
<h1 className="text-4xl font-bold">

// After
<Typography.H1>
```

### Updating Buttons
```tsx
// Before
<Button variant="default">        // Deprecated

// After
<Button variant="primary">        // Semantic
```