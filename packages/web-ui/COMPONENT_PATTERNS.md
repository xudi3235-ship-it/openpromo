# Component Composition Patterns

## Overview
This document outlines recommended patterns for composing UI components in the OpenPromo design system.

## Page Layout Patterns

### 1. Standard Page Layout
```tsx
import { PageLayout, Button } from "@/components";

function MyPage() {
  return (
    <PageLayout
      title="Page Title"
      description="Brief description of the page"
      action={<Button variant="primary">Action</Button>}
    >
      {/* Page content */}
    </PageLayout>
  );
}
```

### 2. Page with Sections
```tsx
import { PageLayout, PageSection, CardGrid } from "@/components";

function MyPage() {
  return (
    <PageLayout title="Dashboard">
      <PageSection
        title="Recent Activity"
        description="Your latest updates"
        action={<Button variant="outline">View All</Button>}
      >
        <CardGrid variant="small">
          {/* Cards */}
        </CardGrid>
      </PageSection>
      
      <PageSection title="Settings">
        {/* Settings content */}
      </PageSection>
    </PageLayout>
  );
}
```

## Card Patterns

### 1. Basic Information Card
```tsx
import { Card, CardHeader, CardContent, Typography, Button } from "@/components";

function InfoCard({ title, description, action }) {
  return (
    <Card className="transition-smooth hover:shadow-md">
      <CardHeader>
        <Typography.H4>{title}</Typography.H4>
        <Typography.BodyBase className="text-neutral-600">
          {description}
        </Typography.BodyBase>
      </CardHeader>
      <CardContent>
        <Button variant="primary" size="sm">
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 2. Status Card with Icon
```tsx
import { Card, CardHeader, Typography, Badge } from "@/components";

function StatusCard({ icon, title, status, count }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 rounded-lg">
              {icon}
            </div>
            <Typography.H4>{title}</Typography.H4>
          </div>
          <Badge variant={status === "active" ? "success" : "secondary"}>
            {count} {status}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}
```

## Form Patterns

### 1. Simple Form
```tsx
import { FormLayout, FormField, TextField, Button } from "@/components";

function SimpleForm() {
  return (
    <FormLayout
      title="Account Settings"
      description="Update your account information"
      actions={
        <>
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Save Changes</Button>
        </>
      }
    >
      <TextField
        label="Email"
        description="Your email address"
        placeholder="you@example.com"
        required
      />
      
      <TextField
        label="Display Name"
        placeholder="Your display name"
      />
    </FormLayout>
  );
}
```

### 2. Multi-Section Form
```tsx
import { FormLayout, FormSection, TextField } from "@/components";

function ProfileForm() {
  return (
    <FormLayout title="Profile Settings">
      <FormSection
        title="Personal Information"
        description="Basic details about you"
      >
        <TextField label="First Name" required />
        <TextField label="Last Name" required />
      </FormSection>
      
      <FormSection
        title="Contact Information"
        description="How we can reach you"
      >
        <TextField label="Email" type="email" required />
        <TextField label="Phone" type="tel" />
      </FormSection>
    </FormLayout>
  );
}
```

## Loading States

### 1. Page Loading
```tsx
import { LoadingPage } from "@/components";

function MyPageSkeleton() {
  return (
    <LoadingPage
      title={true}
      description={true}
      action={true}
      content="grid"
    />
  );
}
```

### 2. Component Loading
```tsx
import { LoadingGrid, LoadingList } from "@/components";

function MyComponent({ isLoading, view }) {
  if (isLoading) {
    return view === "grid" ? <LoadingGrid count={6} /> : <LoadingList count={5} />;
  }
  
  return (
    // Actual content
  );
}
```

## Empty States

### 1. Basic Empty State
```tsx
import { EmptyState, Button } from "@/components";
import { Users } from "lucide-react";

function NoConnections() {
  return (
    <EmptyState
      icon={<Users className="w-12 h-12 text-neutral-400" />}
      title="No connections yet"
      description="Connect your social media accounts to start publishing content"
      action={
        <Button variant="primary">
          Connect Your First Platform
        </Button>
      }
    />
  );
}
```

## List Patterns

### 1. Action List
```tsx
import { Card, Typography, Button } from "@/components";

function ActionList({ items }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <Typography.H5>{item.title}</Typography.H5>
                <Typography.Caption className="text-neutral-600">
                  {item.description}
                </Typography.Caption>
              </div>
            </div>
            <Button variant="outline" size="sm">
              {item.action}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

## Navigation Patterns

### 1. Tab Navigation
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components";

function TabbedInterface() {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview">
        {/* Overview content */}
      </TabsContent>
      
      <TabsContent value="settings">
        {/* Settings content */}
      </TabsContent>
    </Tabs>
  );
}
```

## Modal Patterns

### 1. Confirmation Modal
```tsx
import { Dialog, DialogContent, DialogHeader, DialogFooter, Typography, Button } from "@/components";

function ConfirmationModal({ isOpen, onClose, onConfirm, title, description }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <Typography.H3>{title}</Typography.H3>
          <Typography.BodyBase className="text-neutral-600">
            {description}
          </Typography.BodyBase>
        </DialogHeader>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Utility Class Patterns

### Animation Classes
```tsx
// Smooth transitions
<Card className="transition-smooth hover:shadow-md">

// Entrance animations
<div className="animate-in">

// Exit animations  
<div className="animate-out">
```

### Layout Classes
```tsx
// Page layouts
<div className="page-container">
<div className="page-header">
<div className="page-content">

// Card grids
<div className="card-grid">        // Standard 6-column grid
<div className="card-grid-sm">     // Smaller gap grid
```

### Focus States
```tsx
// Standard focus ring
<button className="focus-ring">

// Error state focus
<input className="focus-ring-error">

// Success state focus  
<button className="focus-ring-success">
```

## Best Practices

### Do ✅
- Use semantic HTML elements with proper ARIA labels
- Compose components using the established patterns
- Use consistent spacing via utility classes
- Apply transitions for smooth interactions
- Follow typography hierarchy
- Use loading states for better UX

### Don't ❌
- Mix different spacing scales in the same component
- Override component styles with arbitrary CSS
- Skip loading and empty states
- Use hardcoded colors instead of design tokens
- Forget to handle error states
- Create deeply nested component structures

### Performance Tips
- Use `React.memo()` for expensive list items
- Implement virtualization for large lists
- Lazy load heavy components
- Use skeleton loading for better perceived performance