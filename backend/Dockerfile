# -------------------------
# Stage 1: Build & Dependencies
# -------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies explicitly to generate prisma client correctly
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client & Build TypeScript
RUN npx prisma generate
RUN npm run build

# Removed: RUN npm ci --only=production to preserve the generated Prisma client

# -------------------------
# Stage 2: Production Runtime
# -------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install openssl for Prisma in production
RUN apk add --no-cache openssl

# Set environment
ENV NODE_ENV=production

# Copy built artifacts and necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3001

# Start the server (ensure index.js is proper entry point)
CMD ["npm", "run", "start"]
