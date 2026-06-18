#!/bin/bash
# Build and start on VPS
# Usage: bash deploy/build-production.sh https://yourdomain.com

set -e

SITE_URL="${1:-http://localhost:3000}"
API_URL="${SITE_URL}/api"

echo "Building with API URL: $API_URL"

# Backend
cd backend
npm install
npm run build
cd ..

# Frontend (NEXT_PUBLIC_* must be set at build time)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=$API_URL" > .env.local
npm run build
cd ..

# Start with PM2
pm2 delete saudichat-api saudichat-web 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo "=== Running ==="
echo "Website: $SITE_URL"
echo "API:     $API_URL"
echo "Health:  $SITE_URL/health"
pm2 status
