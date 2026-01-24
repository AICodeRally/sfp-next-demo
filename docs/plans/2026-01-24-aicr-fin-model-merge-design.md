# SFP Financial Model Engine Integration Design

**Date:** 2026-01-24
**Status:** Approved
**Stack:** AICR Tech Stack (No Docker)

## Goal

Transform sfp-next-demo into a production-grade startup financial modeling tool by integrating the full aicr-fin-model Python engine.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    sfp-next-demo                         │
├─────────────────────────────────────────────────────────┤
│  Next.js Frontend (port 3030)                           │
│  ├── Scenario management UI                             │
│  ├── Settings, Tables, Results pages                    │
│  └── Calls → /api/* routes                              │
├─────────────────────────────────────────────────────────┤
│  Next.js API Routes                                     │
│  ├── /api/scenarios/* → Prisma CRUD                     │
│  └── /api/model/run → calls Python engine               │
├─────────────────────────────────────────────────────────┤
│  Python FastAPI Engine (port 8000)                      │
│  ├── POST /run - execute model                          │
│  ├── POST /validate - run validation gates              │
│  └── POST /export - generate Excel                      │
├─────────────────────────────────────────────────────────┤
│  Neon PostgreSQL (via Prisma)                           │
│  └── scenarios, inputs, outputs, validation_results     │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack (AICR Pattern)

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind |
| **Database** | Neon PostgreSQL (via Prisma 5.22) |
| **Auth** | NextAuth |
| **Compute** | Python FastAPI (local or serverless) |
| **Deploy** | Vercel |

**No Docker** - Following AICR pattern:
- Neon branches for all environments
- Local Python engine runs with `uvicorn`
- Vercel for Next.js deployment

## Project Structure

```
sfp-next-demo/
├── src/                          # Next.js frontend
│   ├── app/
│   │   ├── api/
│   │   │   ├── scenarios/        # CRUD routes
│   │   │   ├── model/            # run, validate, export
│   │   │   └── health/           # Health check
│   │   └── scenarios/            # UI pages
│   └── lib/
│       ├── prisma.ts             # Prisma client
│       ├── api.ts                # API client
│       └── sfp-api-store.ts      # API-backed store
│
├── engine/                       # Python engine
│   ├── api.py                    # FastAPI endpoints
│   ├── orchestrator.py           # Model orchestration
│   ├── cohorts.py                # Cohort calculations
│   ├── revenue.py                # Revenue calculations
│   ├── cogs.py                   # COGS calculations
│   ├── opex.py                   # OpEx calculations
│   ├── statements.py             # 3-statement output
│   ├── validation.py             # Validation gates
│   ├── models.py                 # Pydantic models
│   └── requirements.txt          # Python dependencies
│
├── prisma/
│   └── schema.prisma             # Database schema
│
└── .env.example                  # Environment template
```

## Database Schema

- `Scenario` - Core container (name, status, dataType)
- `ScenarioSettings` - Model settings (1:1)
- `ScenarioInputs` - Input tables as JSON (1:1)
- `ScenarioOutputs` - Output tables as JSON (1:1)
- `ModelRun` - Audit trail of runs (1:many)

## API Design

### Next.js Routes
- `GET/POST /api/scenarios` - List/create
- `GET/PUT/DELETE /api/scenarios/[id]` - CRUD
- `POST /api/model/run` - Execute model
- `POST /api/model/export` - Excel download
- `GET /api/health` - Health check

### Python Endpoints
- `POST /run` - Full model execution
- `POST /validate` - Validation only
- `POST /export` - Excel generation
- `GET /health` - Health check

## Quick Start

```bash
# 1. Install dependencies
pnpm install
pnpm engine:install

# 2. Set up environment (choose one)
cp .env.example .env.local        # Manual setup
# OR
pnpm env:pull                      # From Vercel (requires CLI)

# 3. Push database schema
pnpm db:push

# 4. Run development servers
pnpm dev:all                       # Runs Next.js + Python engine
# OR separately:
pnpm dev                           # Next.js on port 3030
pnpm engine:dev                    # Python on port 8000
```

## Deployment

**Vercel** handles Next.js deployment automatically.

**Python Engine** options:
1. Run as separate service (Railway, Fly.io, etc.)
2. Convert to Vercel Python runtime (future)
3. Deploy to Modal.com for serverless (future)

## Migration Phases

1. ✅ **Setup** - Copy engine, add Prisma, connect Neon
2. ✅ **Python API** - FastAPI endpoints
3. ✅ **Next.js API** - CRUD routes + model execution
4. ⏳ **Frontend** - Wire up API, enhance results page
5. ⏳ **Cleanup** - Delete aicr-fin-model, update docs
