# ==============================================================================
# GuardianAI Backend - Production Dockerfile (Multi-Stage)
# ==============================================================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies including openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

# Copy generated Prisma client artifacts and compiled JavaScript
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

# Security: non-root user
USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]
