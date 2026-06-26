<#
  Deploy the Art Toys stack to a single EC2 instance (Amazon Linux 2023) running
  docker-compose. Designed for AWS Workshop / sandbox accounts (no IAM role creation).

  Prerequisites (run in THIS terminal):
    - AWS CLI v2 installed and temporary creds exported:
        $env:AWS_DEFAULT_REGION, $env:AWS_ACCESS_KEY_ID, $env:AWS_SECRET_ACCESS_KEY, $env:AWS_SESSION_TOKEN
    - `aws sts get-caller-identity` works
    - Your app pushed to a git repo reachable by the instance (public repo is simplest)

  Usage:
    ./deploy/deploy-ec2.ps1 -GitUrl "https://github.com/you/art-toys-blindbox.git" -Branch "main"
#>
param(
  [Parameter(Mandatory = $true)][string]$GitUrl,
  [string]$Branch = "main",
  [string]$Region = $(if ($env:AWS_DEFAULT_REGION) { $env:AWS_DEFAULT_REGION } else { "us-east-1" }),
  [string]$InstanceType = "t3.large",   # 8GB RAM — Next.js build is memory hungry
  [string]$KeyName = "arttoys-key",
  [string]$SgName = "arttoys-sg"
)

$ErrorActionPreference = "Stop"
Write-Host "Region: $Region | Instance: $InstanceType" -ForegroundColor Cyan

# 1) Latest Amazon Linux 2023 AMI (x86_64) from the public SSM parameter
$Ami = aws ssm get-parameters --region $Region `
  --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 `
  --query "Parameters[0].Value" --output text
Write-Host "AMI: $Ami"

# 2) Key pair (for SSH/debug). Saved to ./deploy/$KeyName.pem
$keyPath = "deploy/$KeyName.pem"
$existsKey = aws ec2 describe-key-pairs --region $Region --key-names $KeyName 2>$null
if (-not $existsKey) {
  aws ec2 create-key-pair --region $Region --key-name $KeyName `
    --query "KeyMaterial" --output text | Out-File -Encoding ascii $keyPath
  Write-Host "Created key pair -> $keyPath" -ForegroundColor Green
}

# 3) Security group in the default VPC; open 22, 3000 (web), 3001 (api)
$sgId = aws ec2 describe-security-groups --region $Region `
  --filters "Name=group-name,Values=$SgName" --query "SecurityGroups[0].GroupId" --output text 2>$null
if (-not $sgId -or $sgId -eq "None") {
  $sgId = aws ec2 create-security-group --region $Region `
    --group-name $SgName --description "Art Toys demo" --query "GroupId" --output text
  foreach ($p in 22, 3000, 3001) {
    aws ec2 authorize-security-group-ingress --region $Region `
      --group-id $sgId --protocol tcp --port $p --cidr 0.0.0.0/0 | Out-Null
  }
  Write-Host "Created security group $sgId (ports 22/3000/3001 open)" -ForegroundColor Green
} else {
  Write-Host "Reusing security group $sgId"
}

# 4) Build user-data from template (substitute git url + branch)
$userData = Get-Content -Raw "deploy/ec2-userdata.sh"
$userData = $userData.Replace("__GIT_URL__", $GitUrl).Replace("__BRANCH__", $Branch)
$tmp = New-TemporaryFile
Set-Content -Path $tmp -Value $userData -Encoding ascii

# 5) Launch the instance
$instanceId = aws ec2 run-instances --region $Region `
  --image-id $Ami --instance-type $InstanceType --key-name $KeyName `
  --security-group-ids $sgId `
  --user-data "file://$($tmp.FullName)" `
  --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3}" `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=arttoys-demo}]" `
  --query "Instances[0].InstanceId" --output text
Write-Host "Launched instance: $instanceId" -ForegroundColor Green

Write-Host "Waiting for instance to be running..."
aws ec2 wait instance-running --region $Region --instance-ids $instanceId

$publicIp = aws ec2 describe-instances --region $Region --instance-ids $instanceId `
  --query "Reservations[0].Instances[0].PublicIpAddress" --output text

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Instance is running. The app is building in the background (~5-8 min)." -ForegroundColor Cyan
Write-Host "   Web:  http://$publicIp:3000"
Write-Host "   API:  http://$publicIp:3001/api/health"
Write-Host "   SSH:  ssh -i $keyPath ec2-user@$publicIp"
Write-Host "   Logs: ssh in, then: sudo cat /var/log/cloud-init-output.log"
Write-Host "==================================================================" -ForegroundColor Cyan
