#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
contact_email="${1:-}"
if [[ ! "$contact_email" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo 'Usage: ./deploy/setup-ssl.sh admin@example.com' >&2
  exit 2
fi
mkdir -p deploy/certbot deploy/letsencrypt
if docker ps --format '{{.Names}}' | grep -qx 'mebel48-acme'; then
  echo 'ACME temporary server already running' >&2; exit 1
fi
docker run -d --rm --name mebel48-acme -p 80:80 \
  -v "$PWD/deploy/certbot:/var/www/certbot" \
  -v "$PWD/deploy/acme.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.27-alpine >/dev/null
cleanup(){ docker stop mebel48-acme >/dev/null 2>&1 || true; }
trap cleanup EXIT
for domain in api.mebel48.uz admin.mebel48.uz app.mebel48.uz files.mebel48.uz; do
  docker run --rm -v "$PWD/deploy/letsencrypt:/etc/letsencrypt" \
    -v "$PWD/deploy/certbot:/var/www/certbot" certbot/certbot certonly \
    --non-interactive --agree-tos --email "$contact_email" --webroot \
    -w /var/www/certbot --cert-name "$domain" -d "$domain"
done
echo 'Certificates created. Start the stack with docker compose up -d --build.'
