FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy necessary files from build stage
COPY --from=build /app/next.config.mjs ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Create a .env.production file
RUN echo "APP_NAME='MobiDrawer'" > .env.production && \
    echo "MODE_ENV='production'" >> .env.production && \
    echo "API_WEB='http://backend:8080/api/v1'" >> .env.production

EXPOSE 3000

CMD ["npm", "start"]