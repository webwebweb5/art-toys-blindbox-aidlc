# Art Toys Blind Box — Infrastructure

## Architecture Diagram

```
                          ┌──────────────────────────────────────────────────────────────┐
                          │                        AWS Cloud                              │
                          │                                                              │
    Users ──────┐         │  ┌──────────┐     ┌────────────┐     ┌────────────────────┐  │
                │         │  │CloudFront│────▶│  S3 Bucket │     │    Route 53        │  │
                │         │  │  (CDN)   │     │  (Static)  │     │  (DNS + SSL/ACM)   │  │
                ▼         │  └──────────┘     └────────────┘     └────────────────────┘  │
         ┌────────────┐   │        │                                       │             │
         │    ALB     │◀──┼────────┘                                       │             │
         │ (Internet) │   │                                                │             │
         └─────┬──────┘   │                                                │             │
               │          │  ┌──────────────── VPC ─────────────────────────────────┐    │
               │          │  │                                                      │    │
               │          │  │  ┌─── Public Subnets (2 AZs) ───┐                   │    │
               │          │  │  │       ALB Target Groups       │                   │    │
               │          │  │  └───────────┬───────────────────┘                   │    │
               │          │  │              │                                       │    │
               ▼          │  │  ┌─── Private Subnets (2 AZs) ──────────────────┐    │    │
        ┌──────────────┐  │  │  │                                              │    │    │
        │  ECS Fargate │  │  │  │  ┌──────────────┐   ┌──────────────────┐     │    │    │
        │   Cluster    │──┼──┼──┼─▶│  API Service │   │   Web Service    │     │    │    │
        └──────────────┘  │  │  │  │ (2-8 tasks)  │   │  (2-4 tasks)    │     │    │    │
                          │  │  │  └──────┬───────┘   └──────────────────┘     │    │    │
                          │  │  │         │                                    │    │    │
                          │  │  │         ▼                                    │    │    │
                          │  │  │  ┌──────────────┐   ┌──────────────────┐     │    │    │
                          │  │  │  │  RDS Postgres│   │ ElastiCache Redis│     │    │    │
                          │  │  │  │  (Multi-AZ)  │   │   (Cluster)     │     │    │    │
                          │  │  │  │ db.r6g.large │   │ cache.r6g.large │     │    │    │
                          │  │  │  └──────────────┘   └──────────────────┘     │    │    │
                          │  │  │                                              │    │    │
                          │  │  └──────────────────────────────────────────────┘    │    │
                          │  └──────────────────────────────────────────────────────┘    │
                          └──────────────────────────────────────────────────────────────┘
```

## AWS Resources

### Compute

| Resource | Configuration | Purpose |
|----------|--------------|---------|
| ECS Fargate Cluster | `arttoys-cluster-{env}` | Container orchestration |
| ECS Service — API | 2-8 tasks, auto-scaling (CPU > 70%) | NestJS backend |
| ECS Service — Web | 2-4 tasks, auto-scaling (CPU > 60%) | Next.js frontend |

### Database & Cache

| Resource | Configuration | Purpose |
|----------|--------------|---------|
| RDS PostgreSQL | `db.r6g.large`, Multi-AZ, 100GB GP3 | Primary database |
| ElastiCache Redis | `cache.r6g.large`, 2 nodes | Cache, BullMQ, Socket.io adapter, pub/sub |

### Networking

| Resource | Configuration | Purpose |
|----------|--------------|---------|
| VPC | 10.0.0.0/16, 2 AZs | Network isolation |
| Public Subnets | 10.0.1.0/24, 10.0.2.0/24 | ALB, NAT Gateway |
| Private Subnets | 10.0.10.0/24, 10.0.20.0/24 | ECS, RDS, Redis |
| NAT Gateway | 1 per AZ | Outbound internet for private subnets |
| ALB | Internet-facing, HTTPS (443) | Load balancing, SSL termination |
| Target Group — API | Port 3001, `/api/health` healthcheck | API routing |
| Target Group — Web | Port 3000, `/` healthcheck | Web routing |

### CDN & DNS

| Resource | Configuration | Purpose |
|----------|--------------|---------|
| CloudFront | Origins: ALB + S3 | CDN, edge caching |
| S3 Bucket | `arttoys-static-{env}` | Static assets (images, videos) |
| Route 53 | Hosted zone for domain | DNS management |
| ACM Certificate | `*.arttoys.example.com` | SSL/TLS |

### Security

| Resource | Configuration | Purpose |
|----------|--------------|---------|
| SG — ALB | Inbound: 443 from 0.0.0.0/0 | Public HTTPS |
| SG — ECS | Inbound: 3000-3001 from ALB SG | Container access |
| SG — RDS | Inbound: 5432 from ECS SG | Database access |
| SG — Redis | Inbound: 6379 from ECS SG | Cache access |
| IAM — Task Execution Role | ECR pull, CloudWatch logs, Secrets Manager | ECS task startup |
| IAM — Task Role | S3 access, SES, X-Ray | Application permissions |

### Secrets & Configuration

| Resource | Configuration | Purpose |
|----------|--------------|---------|
| Secrets Manager | `arttoys/{env}/api` | JWT secrets, Stripe keys, DB password |
| SSM Parameter Store | `/arttoys/{env}/*` | Non-sensitive config |

---

## Environment Configuration

### Development
```env
NODE_ENV=development
DATABASE_URL=postgresql://arttoys:arttoys_dev@localhost:5432/arttoys_dev
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-minimum-32-characters
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Staging
```env
NODE_ENV=production
DATABASE_URL=postgresql://arttoys:${secret}@arttoys-staging.xxx.rds.amazonaws.com:5432/arttoys
REDIS_HOST=arttoys-staging.xxx.cache.amazonaws.com
REDIS_PORT=6379
JWT_SECRET=${from-secrets-manager}
STRIPE_SECRET_KEY=${from-secrets-manager}
NEXT_PUBLIC_API_URL=https://staging-api.arttoys.example.com
```

### Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://arttoys:${secret}@arttoys-prod.xxx.rds.amazonaws.com:5432/arttoys
REDIS_HOST=arttoys-prod.xxx.cache.amazonaws.com
REDIS_PORT=6379
JWT_SECRET=${from-secrets-manager}
STRIPE_SECRET_KEY=${from-secrets-manager}
NEXT_PUBLIC_API_URL=https://api.arttoys.example.com
```

---

## Deployment Commands Reference

### Local Docker Build
```bash
# Build API image
docker build -f apps/api/Dockerfile -t arttoys-api:local .

# Build Web image
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  --build-arg NEXT_PUBLIC_WS_URL=http://localhost:3001 \
  -t arttoys-web:local .

# Run full stack locally
docker compose -f docker/docker-compose.prod.yml up -d
```

### ECR Push
```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com

# Tag and push
docker tag arttoys-api:local <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/arttoys-api:latest
docker push <account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/arttoys-api:latest
```

### ECS Deployment
```bash
# Force new deployment (uses latest image tag)
aws ecs update-service --cluster arttoys-cluster-production \
  --service arttoys-api-production --force-new-deployment

# Register new task definition
aws ecs register-task-definition --cli-input-json file://infrastructure/task-definition-api.json

# Rollback (revert to previous task definition)
aws ecs update-service --cluster arttoys-cluster-production \
  --service arttoys-api-production \
  --task-definition arttoys-api:<previous-revision>
```

### Database Migrations (Production)
```bash
# Run via ECS exec (requires ECS Exec enabled on service)
aws ecs execute-command --cluster arttoys-cluster-production \
  --task <task-id> --container api \
  --interactive --command "npx prisma migrate deploy"
```

### Monitoring
```bash
# View service logs
aws logs tail /ecs/arttoys-api-production --follow

# Check service status
aws ecs describe-services --cluster arttoys-cluster-production \
  --services arttoys-api-production --query 'services[0].{status:status,desired:desiredCount,running:runningCount}'
```
