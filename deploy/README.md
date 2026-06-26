# Deploy — Art Toys Blind Box

Demo/staging deployment to a single EC2 instance running the full stack via
`docker-compose` (api, web, PostgreSQL, Redis). Designed for AWS Workshop /
sandbox accounts where you **cannot create IAM roles** (so ECS Fargate is not viable).

> ⚠️ This creates **real, billable AWS resources** (one EC2 instance + EBS volume).
> Terminate it when done. Demo-grade only: HTTP (no TLS), ports open to the world,
> Stripe runs in mock mode, uploaded images live on the instance disk (ephemeral).

## Prerequisites

1. **AWS CLI v2** installed, temporary credentials exported in your terminal:
   ```powershell
   $env:AWS_DEFAULT_REGION   = "us-east-1"   # your workshop region
   $env:AWS_ACCESS_KEY_ID     = "ASIA..."
   $env:AWS_SECRET_ACCESS_KEY = "..."
   $env:AWS_SESSION_TOKEN     = "..."
   aws sts get-caller-identity   # should succeed
   ```
2. **Push the app to a git repo** the instance can clone. Simplest is a public
   GitHub repo whose **root is the `art-toys-blindbox` folder**:
   ```powershell
   cd art-toys-blindbox
   git init -b main
   git add .
   git commit -m "Art Toys app"
   git remote add origin https://github.com/<you>/art-toys-blindbox.git
   git push -u origin main
   ```
   (`.env` and `apps/api/uploads/*` are gitignored — no secrets are committed.)

## Deploy

```powershell
./deploy/deploy-ec2.ps1 -GitUrl "https://github.com/<you>/art-toys-blindbox.git" -Branch "main"
```

The script:
1. Finds the latest Amazon Linux 2023 AMI.
2. Creates an SSH key pair (`deploy/arttoys-key.pem`) and a security group (ports 22/3000/3001).
3. Launches a `t3.large` instance with user-data that installs Docker, clones the
   repo, generates secrets, builds the images, starts the stack, and runs DB
   migrations + seed.
4. Prints the public URLs.

App build takes ~5–8 minutes after the instance starts. Then:
- Web: `http://<public-ip>:3000`
- API health: `http://<public-ip>:3001/api/health`
- Seeded admin: `admin@arttoys.com / admin123456`

## Inspect / troubleshoot

```bash
ssh -i deploy/arttoys-key.pem ec2-user@<public-ip>
sudo cat /var/log/cloud-init-output.log          # bootstrap log
cd /opt/app && docker compose -f docker/docker-compose.prod.yml ps
docker compose -f docker/docker-compose.prod.yml logs -f api
```

## Tear down (stop billing)

```powershell
# find the instance
aws ec2 describe-instances --filters "Name=tag:Name,Values=arttoys-demo" `
  --query "Reservations[].Instances[].InstanceId" --output text
# terminate it
aws ec2 terminate-instances --instance-ids <instance-id>
```

## Going to real production (later, with a full account)

Use the assets under `infrastructure/` (ECS task definitions) + the design NFR
(`.aidlc/specs/art-toys-blindbox/design/nfr.md`): ECS Fargate + RDS PostgreSQL +
ElastiCache Redis + ALB + S3/CloudFront for uploads + ACM TLS. That path needs
IAM role creation (task execution role) which workshop accounts usually block.
