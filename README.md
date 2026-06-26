# Art Toys Blind Box Platform

Digital blind box Art Toys platform enabling online purchase with digital reveal and physical branch pickup.

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: NestJS 10 (Modular Monolith)
- **Database**: PostgreSQL 16 (Prisma ORM)
- **Cache**: Redis 7 (ioredis)
- **Auth**: JWT + RBAC (Passport.js)
- **Build**: Turborepo + pnpm workspaces
- **Testing**: Vitest + Playwright

## Getting Started

### Prerequisites

- Node.js >= 20.x
- pnpm >= 8.x
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
docker compose -f docker/docker-compose.yml up -d

# Run database migrations
pnpm --filter api db:migrate

# Seed development data
pnpm --filter api db:seed

# Start development servers
pnpm dev
```

### Individual Services

```bash
pnpm --filter api dev   # NestJS on localhost:3001
pnpm --filter web dev   # Next.js on localhost:3000
```

## Project Structure

```
art-toys-blindbox/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   ├── shared-utils/ # Error classes, logger, helpers
│   └── config/       # ESLint, TSConfig, Vitest configs
├── docker/           # Docker compose files
├── turbo.json        # Turborepo config
└── pnpm-workspace.yaml
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in dev mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm clean` | Clean all build artifacts |
