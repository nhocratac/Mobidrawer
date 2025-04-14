#!/bin/bash

# Load environment variables
set -a
source .env.production
set +a

# Stop any running containers
echo "Stopping any existing containers..."
docker-compose down

# Start the containers in production mode
echo "Starting production containers..."
docker-compose up -d

# Wait for services to be fully up
echo "Waiting for services to start..."
sleep 10

# Check if containers are running
echo "Checking container status:"
docker-compose ps

echo "Production deployment complete!"
echo "Frontend available at: http://your-server-ip:3000"
echo "Backend API available at: http://your-server-ip:8080"