#!/bin/bash

# Load environment variables
set -a
source .env.production
set +a

# Build images with production optimization and no cache
echo "Building production Docker images..."
docker-compose build --no-cache

echo "Docker images built successfully!"
echo "To deploy, run: ./deploy-prod.sh"