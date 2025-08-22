
# Use official Node.js LTS image
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm
RUN npm add -g typescript

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

RUN pnpm run prisma

# Build the application
RUN pnpm run build || true

# Production image
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy built app and node_modules from build stage
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Expose port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:4000/health || exit 1

# Start the application
CMD ["node", "dist/app.js"]
