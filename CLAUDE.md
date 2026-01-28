# Demo Repo - AI Agent Instructions

> **This file is auto-read by Claude Code at session start.**

## Coding Standards

This repo follows AICR platform coding standards. **Critical rules:**

### Prisma Naming (Pattern A)

**ALL Prisma code uses camelCase. Database columns use snake_case via @map.**

```prisma
// ✅ CORRECT - Pattern A
model Organization {
  id          String   @id
  tenantId    String   @map("tenant_id")
  createdAt   DateTime @map("created_at")
  @@map("organizations")
}
```

```typescript
// ✅ CORRECT - camelCase in TypeScript
await prisma.organization.findUnique({ where: { tenantId } })

// ❌ WRONG - snake_case in TypeScript  
await prisma.organizations.findUnique({ where: { tenant_id } })
```

**Full guide:** https://github.com/AICodeRally/AICR/blob/main/.claude/DATABASE_NAMING.md

### TypeScript
- Strict mode enabled
- No `any` types without justification
- Use async/await over raw promises

### React/Next.js
- Use App Router patterns
- Server Components by default
- Client Components only when needed ('use client')

## Quick Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production  
pnpm typecheck    # TypeScript check
pnpm db:generate  # Generate Prisma client
```
