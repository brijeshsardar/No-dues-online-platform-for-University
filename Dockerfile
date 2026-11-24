FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend manifests and prisma schema
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies and generate prisma client
RUN npm ci
RUN npx prisma generate

# Copy source and build
COPY backend/tsconfig.json ./
COPY backend/src ./src/
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
