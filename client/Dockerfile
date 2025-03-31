FROM node:18-alpine AS base

# Set Node options to a lower memory limit suitable for small VPS
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with clean slate
RUN npm ci --omit=dev --no-audit --no-fund

# Install sharp for image optimization
RUN npm install sharp

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with memory optimizations
RUN npm run build

# Production image, copy all the files and run next
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from build stage
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create a .env.production file
RUN echo "APP_NAME='MobiDrawer'" > .env.production && \
    echo "MODE_ENV='production'" >> .env.production && \
    echo "API_WEB='http://backend:8080/api/v1'" >> .env.production

EXPOSE 3000

CMD ["npm", "start"]