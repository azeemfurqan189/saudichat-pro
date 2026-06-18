#!/bin/bash
# SaudiChat Pro — Namecheap VPS one-click setup (Ubuntu 22.04)
# Run as root on fresh VPS: bash deploy/install-vps.sh

set -e

DOMAIN="${1:-yourdomain.com}"
APP_DIR="/var/www/saudichat-pro"
DB_URL="${DATABASE_URL:-}"

echo "=== SaudiChat Pro VPS Setup ==="

# System packages
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2

# App directory
mkdir -p "$APP_DIR"
echo "Upload or git clone your project to $APP_DIR"
echo "Then run: cd $APP_DIR && bash deploy/build-production.sh https://$DOMAIN"

# Enable nginx site
if [ -f "$APP_DIR/deploy/nginx-saudichat.conf" ]; then
  sed "s/YOUR_DOMAIN.com/$DOMAIN/g" "$APP_DIR/deploy/nginx-saudichat.conf" > /etc/nginx/sites-available/saudichat
  ln -sf /etc/nginx/sites-available/saudichat /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
fi

# SSL (after domain DNS points to this VPS IP)
echo "After DNS is live, run:"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"

echo "=== Done. See DEPLOY-NAMECHEAP.md for full steps ==="
