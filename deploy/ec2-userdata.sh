#!/bin/bash
# Bootstrap an Amazon Linux 2023 instance to run the Art Toys stack via docker-compose.
# Placeholders __GIT_URL__ and __BRANCH__ are substituted by deploy-ec2.ps1.
set -euxo pipefail

GIT_URL="__GIT_URL__"
BRANCH="__BRANCH__"

# 1) Install Docker + git + compose plugin
dnf update -y
dnf install -y docker git openssl
systemctl enable --now docker
usermod -aG docker ec2-user || true

mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 2) Clone the app
cd /opt
rm -rf app
git clone --branch "$BRANCH" "$GIT_URL" app
cd app

# 3) Resolve public IP (IMDSv2) for the frontend/API URLs + CORS
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 120")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)

# 4) Generate environment (secrets random; Stripe stays in mock mode for the demo)
cat > .env <<EOF
POSTGRES_USER=arttoys
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=arttoys
REDIS_PASSWORD=
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_API_URL=http://$PUBLIC_IP:3001
NEXT_PUBLIC_WS_URL=http://$PUBLIC_IP:3001
CORS_ORIGIN=http://$PUBLIC_IP:3000
PORT=3001
EOF

# 5) Build + start the full stack (api, web, postgres, redis)
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build

# 6) Run DB migrations + seed once Postgres is healthy
sleep 25
docker compose -f docker/docker-compose.prod.yml --env-file .env exec -T api npx prisma migrate deploy || true
docker compose -f docker/docker-compose.prod.yml --env-file .env exec -T api npx ts-node prisma/seed.ts || true

echo "Art Toys deployed. Web: http://$PUBLIC_IP:3000  API: http://$PUBLIC_IP:3001/api/health" > /opt/app/DEPLOY_INFO.txt
