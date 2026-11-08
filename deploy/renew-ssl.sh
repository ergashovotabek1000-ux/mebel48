#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker run --rm -v "$PWD/deploy/letsencrypt:/etc/letsencrypt" \
  -v "$PWD/deploy/certbot:/var/www/certbot" certbot/certbot renew \
  --webroot -w /var/www/certbot --non-interactive
docker compose exec -T nginx nginx -s reload
