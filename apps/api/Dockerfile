# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY apps/api/package.json apps/api/tsconfig.json ./
COPY packages/shared ./packages/shared
RUN npm install

COPY apps/api/src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY apps/api/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
