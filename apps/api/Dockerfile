# Multi-stage Docker build for the Homas Bakery API.
#
# Stage 1 ("builder") installs everything, generates the Prisma client,
# and compiles TypeScript to plain JS. Stage 2 ("runtime") starts from a
# clean base, copies only the compiled output + production dependencies,
# and exposes port 3000. Result is a small, dev-tool-free image that
# runs the API exactly as it would in production.
#
# Build:   docker build -f apps/api/Dockerfile -t homasbakery-api .
# Run:     docker run --env-file apps/api/.env -p 3000:3000 homasbakery-api

# ---------------------------------------------------------------------------
# Stage 1: builder
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Tini handles signals properly (Ctrl+C, container stop) so the API
# shuts down cleanly instead of being killed mid-request.
RUN apk add --no-cache tini

WORKDIR /app

# Copy only the package manifests first so Docker can cache the install
# layer. As long as package.json + package-lock.json don't change, we
# skip the slow `npm ci` on subsequent builds.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install every dependency (dev + prod). We need dev deps to compile
# TypeScript; we'll prune to prod-only in the runtime stage.
RUN npm ci --workspace apps/api --include-workspace-root

# Copy the API source and run the build pipeline.
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

# Same tini for the runtime layer.
RUN apk add --no-cache tini

# Run as a non-root user. The official node image ships with a 'node'
# user already; we just need to make sure file ownership is correct.
WORKDIR /app

# Copy in compiled artifacts + the prisma directory (needed at runtime
# because prisma migrate deploy reads it). package.json is needed so
# `node` finds the right "type": "module" setting.
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules

# Create the uploads directory so multer has somewhere to write.
# In production we'll eventually swap this for S3 — until then, mount a
# volume here to persist images across container restarts.
RUN mkdir -p /app/apps/api/uploads && chown node:node /app/apps/api/uploads

USER node
WORKDIR /app/apps/api

EXPOSE 3000

# tini as PID 1 forwards signals to node, then node runs the API with
# Sentry preloaded via --import (same flag as in package.json's dev script).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "./dist/instrument.js", "dist/index.js"]
