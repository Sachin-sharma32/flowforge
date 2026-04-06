# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY packages/shared ./packages/shared
RUN cd packages/shared && npm install && npm run build

COPY apps/api/package.json apps/api/tsconfig.json ./
RUN npm install --install-strategy=nested --ignore-scripts && \
    rm -rf node_modules/@flowforge/shared && \
    ln -s /app/packages/shared node_modules/@flowforge/shared

COPY apps/api/src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY apps/api/package.json ./
RUN npm install --omit=dev --install-strategy=nested --ignore-scripts || true
RUN rm -rf node_modules/@flowforge

COPY --from=builder /app/packages/shared ./node_modules/@flowforge/shared
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
