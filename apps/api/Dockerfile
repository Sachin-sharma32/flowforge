# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY packages/shared ./packages/shared
RUN cd packages/shared && npm install && npm run build

COPY apps/api/package.json apps/api/tsconfig.json ./
RUN node -e "const p=require('./package.json'); delete p.dependencies['@flowforge/shared']; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))" && \
    npm install && \
    ln -s /app/packages/shared node_modules/@flowforge/shared

COPY apps/api/src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY apps/api/package.json ./
RUN node -e "const p=require('./package.json'); delete p.dependencies['@flowforge/shared']; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))" && \
    npm install --omit=dev

COPY --from=builder /app/packages/shared ./node_modules/@flowforge/shared
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
