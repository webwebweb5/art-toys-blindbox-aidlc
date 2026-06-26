# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy package.json files for all workspaces (for dependency resolution)
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/config/package.json ./packages/config/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Generate Prisma client (openssl present so the correct engine is produced)
RUN pnpm --filter api db:generate

# Build the API
RUN pnpm --filter api build

# ============================================
# Stage 3: Production image
# ============================================
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init libc6-compat openssl

ENV NODE_ENV=production

WORKDIR /app

# Copy the whole built workspace so pnpm's symlinked node_modules + the
# generated Prisma client (.pnpm store) stay intact. Run from the api package.
COPY --from=builder /app ./

WORKDIR /app/apps/api

EXPOSE 3001
ENV PORT=3001

# dumb-init handles PID 1 + signal forwarding
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main"]
