# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace=apps/api --workspace=packages/shared

COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src
RUN npm run build --workspace=apps/api

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace=apps/api --workspace=packages/shared --omit=dev

COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
