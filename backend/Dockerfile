# Multi-stage Dockerfile for NestJS microservices

# ==========================================
# Base Stage
# ==========================================
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma clients
RUN yarn prisma:generate

# Build all services
RUN yarn build:all

# ==========================================
# API Gateway
# ==========================================
FROM node:20-alpine AS api-gateway

WORKDIR /app

# Copy dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built code
COPY --from=base /app/dist/apps/api-gateway ./dist/apps/api-gateway
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/apps/api-gateway/prisma ./apps/api-gateway/prisma

EXPOSE 3001

CMD ["node", "dist/apps/api-gateway/main.js"]

# ==========================================
# Keeper
# ==========================================
FROM node:20-alpine AS keeper

WORKDIR /app

# Copy dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built code
COPY --from=base /app/dist/apps/keeper ./dist/apps/keeper

EXPOSE 3002

CMD ["node", "dist/apps/keeper/main.js"]

# ==========================================
# Indexer
# ==========================================
FROM node:20-alpine AS indexer

WORKDIR /app

# Copy dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built code
COPY --from=base /app/dist/apps/indexer ./dist/apps/indexer
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/apps/indexer/prisma ./apps/indexer/prisma

EXPOSE 3003

CMD ["node", "dist/apps/indexer/main.js"]

# ==========================================
# Analytics
# ==========================================
FROM node:20-alpine AS analytics

WORKDIR /app

# Copy dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built code
COPY --from=base /app/dist/apps/analytics ./dist/apps/analytics
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/apps/analytics/prisma ./apps/analytics/prisma

EXPOSE 3004

CMD ["node", "dist/apps/analytics/main.js"]
