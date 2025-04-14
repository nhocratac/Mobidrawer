FROM node:20-alpine AS base

# Set up working directory
WORKDIR /app

# Install dependencies with production flag to save space
COPY package.json package-lock.json* ./
RUN npm ci --production=false --no-audit --no-fund && npm cache clean --force

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy only necessary files from builder
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/next.config.mjs ./next.config.mjs

# Install only production dependencies
COPY --from=base /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]