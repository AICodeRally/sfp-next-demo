# Startup Financial Planning (SFP)

Standalone domain-style demo app for the SFP workflow: Settings → Tables → Results → Export.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Data Model

- Local persistence via `localStorage` (`sfp_scenarios_v1`).
- Typed schemas with Zod in `src/lib/sfp-types.ts`.
- A seeded Base Scenario loads automatically on first run.

To reset to the seed data, clear localStorage in the browser.

## Core Workflow

1. Create or open a scenario.
2. Adjust settings and table inputs.
3. Run the model from Settings or Results.
4. Review outputs and export stubs.

## What’s Implemented (v0.1)

- Scenario list + create/clone/lock actions
- Settings page with grouped controls
- Table editor with left rail + grid + row drawer
- Deterministic run model with monthly outputs
- Results dashboard and export stubs

## Notes on Baseline Parity

Mirrored from SGM demo patterns:
- App Router structure and route layout
- Left-rail navigation + consistent page headers
- Tailwind + shadcn-style components and cards

Intentionally skipped for v0.1:
- Auth/multi-tenant access controls
- Database persistence and background jobs
- Complex financial math and charting libraries

## Key Locations

- `src/app/page.tsx` – in-app landing
- `src/app/scenarios/page.tsx` – scenario list
- `src/app/scenarios/[id]/settings/page.tsx` – scenario settings
- `src/app/scenarios/[id]/tables/page.tsx` – table editor
- `src/app/scenarios/[id]/results/page.tsx` – outputs
- `src/app/scenarios/[id]/export/page.tsx` – export stubs
- `src/lib/sfp-model.ts` – deterministic model logic
- `src/lib/sfp-store.ts` – local persistence

