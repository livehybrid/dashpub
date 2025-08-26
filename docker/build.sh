#!/bin/bash

# Production Docker Build Script
# This script builds and deploys the dashboard application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="splunk-dashboard"
TAG="latest"
CONTAINER_NAME="splunk-dashboard-app"

echo -e "${BLUE}🐳 Splunk Dashboard Docker Build Script${NC}"
echo "=========================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "../package.json" ]; then
    print_error "This script must be run from the docker/ directory with the app root as parent."
    exit 1
fi

# Build the Docker image
echo -e "\n${BLUE}🔨 Building Docker image...${NC}"
docker build -f Dockerfile -t ${IMAGE_NAME}:${TAG} ..

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "\n${BLUE}🛑 Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} || true
    docker rm ${CONTAINER_NAME} || true
    print_status "Existing container removed"
fi

# Create logs directory
mkdir -p logs

# Run the container
echo -e "\n${BLUE}🚀 Starting container...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -p 3000:3000 \
    -v "$(pwd)/../src/dashboards:/app/src/dashboards:ro" \
    -v "$(pwd)/../src/_dashboards.json:/app/src/_dashboards.json:ro" \
    -v "$(pwd)/../src/pages/api/data:/app/src/pages/api/data:ro" \
    -v "$(pwd)/logs:/app/logs" \
    --env-file env.production.example \
    ${IMAGE_NAME}:${TAG}

if [ $? -eq 0 ]; then
    print_status "Container started successfully!"
else
    print_error "Failed to start container"
    exit 1
fi

# Wait for container to be healthy
echo -e "\n${BLUE}⏳ Waiting for container to be ready...${NC}"
sleep 10

# Check container status
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "${CONTAINER_NAME}.*Up"; then
    print_status "Container is running and healthy!"
    echo -e "\n${BLUE}📊 Container Information:${NC}"
    echo "Name: ${CONTAINER_NAME}"
    echo "Image: ${IMAGE_NAME}:${TAG}"
    echo "Port: 3000"
    echo "Status: $(docker ps --format "{{.Status}}" --filter "name=${CONTAINER_NAME}")"
    
    echo -e "\n${BLUE}🌐 Access your dashboard at:${NC}"
    echo "http://localhost:3000"
    
    echo -e "\n${BLUE}📝 Useful commands:${NC}"
    echo "View logs: docker logs -f ${CONTAINER_NAME}"
    echo "Stop container: docker stop ${CONTAINER_NAME}"
    echo "Restart container: docker restart ${CONTAINER_NAME}"
    echo "Remove container: docker rm ${CONTAINER_NAME}"
    
else
    print_error "Container failed to start properly"
    echo -e "\n${BLUE}📋 Container logs:${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
