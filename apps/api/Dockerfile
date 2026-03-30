# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
COPY ../../packages/shared ./packages/shared
RUN npm install

COPY src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
