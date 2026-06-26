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

$ErrorActionPreference = "Continue"
# Native (aws) commands must not terminate the script on stderr/non-zero exit.
# We check $LASTEXITCODE explicitly and throw ourselves where it matters.
$PSNativeCommandUseErrorActionPreference = $false

function Invoke-Aws {
  # Run aws, suppress stderr, return trimmed stdout. Caller checks $LASTEXITCODE.
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AwsArgs)
  $out = & aws @AwsArgs 2>$null
  return (($out | Out-String).Trim())
}

Write-Host "Region: $Region | Instance: $InstanceType" -ForegroundColor Cyan

# 1) Latest Amazon Linux 2023 AMI (x86_64) from the public SSM parameter
$Ami = Invoke-Aws ssm get-parameters --region $Region `
  --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 `
  --query "Parameters[0].Value" --output text
if (-not $Ami -or $Ami -eq "None") { throw "Could not resolve AL2023 AMI in $Region" }
Write-Host "AMI: $Ami"

# 2) Key pair (for SSH/debug). Saved to ./deploy/$KeyName.pem
$keyPath = "deploy/$KeyName.pem"
Invoke-Aws ec2 describe-key-pairs --region $Region --key-names $KeyName | Out-Null
if ($LASTEXITCODE -ne 0) {
  $material = Invoke-Aws ec2 create-key-pair --region $Region --key-name $KeyName `
    --query "KeyMaterial" --output text
  if ($LASTEXITCODE -ne 0) { throw "Failed to create key pair" }
  Set-Content -Path $keyPath -Value $material -Encoding ascii
  Write-Host "Created key pair -> $keyPath" -ForegroundColor Green
} else {
  Write-Host "Reusing key pair '$KeyName' (need existing $keyPath to SSH)"
}

# 3) Security group in the default VPC; open 22, 3000 (web), 3001 (api)
$sgId = Invoke-Aws ec2 describe-security-groups --region $Region `
  --filters "Name=group-name,Values=$SgName" --query "SecurityGroups[0].GroupId" --output text
if (-not $sgId -or $sgId -eq "None") {
  $sgId = Invoke-Aws ec2 create-security-group --region $Region `
    --group-name $SgName --description "Art Toys demo" --query "GroupId" --output text
  if ($LASTEXITCODE -ne 0 -or -not $sgId) { throw "Failed to create security group" }
  foreach ($p in 22, 3000, 3001) {
    Invoke-Aws ec2 authorize-security-group-ingress --region $Region `
      --group-id $sgId --protocol tcp --port $p --cidr 0.0.0.0/0 | Out-Null
  }
  Write-Host "Created security group $sgId (ports 22/3000/3001 open)" -ForegroundColor Green
} else {
  Write-Host "Reusing security group $sgId"
}

# 4) Build user-data from template (substitute git url + branch, force LF line endings)
$userData = Get-Content -Raw "deploy/ec2-userdata.sh"
$userData = $userData.Replace("__GIT_URL__", $GitUrl).Replace("__BRANCH__", $Branch)
$userData = $userData.Replace("`r`n", "`n").Replace("`r", "`n")
$tmp = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmp, $userData, (New-Object System.Text.UTF8Encoding($false)))

# 5) Launch the instance
$instanceId = Invoke-Aws ec2 run-instances --region $Region `
  --image-id $Ami --instance-type $InstanceType --key-name $KeyName `
  --security-group-ids $sgId `
  --user-data "file://$tmp" `
  --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3}" `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=arttoys-demo}]" `
  --query "Instances[0].InstanceId" --output text
if ($LASTEXITCODE -ne 0 -or -not $instanceId) { throw "Failed to launch instance" }
Write-Host "Launched instance: $instanceId" -ForegroundColor Green

Write-Host "Waiting for instance to be running..."
Invoke-Aws ec2 wait instance-running --region $Region --instance-ids $instanceId | Out-Null

$publicIp = Invoke-Aws ec2 describe-instances --region $Region --instance-ids $instanceId `
  --query "Reservations[0].Instances[0].PublicIpAddress" --output text

Remove-Item $tmp -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Instance running. App is building in the background (~5-8 min)." -ForegroundColor Cyan
Write-Host "   Web:  http://${publicIp}:3000"
Write-Host "   API:  http://${publicIp}:3001/api/health"
Write-Host "   SSH:  ssh -i $keyPath ec2-user@$publicIp"
Write-Host "   Logs: ssh in, then: sudo cat /var/log/cloud-init-output.log"
Write-Host "   Stop: aws ec2 terminate-instances --instance-ids $instanceId"
Write-Host "==================================================================" -ForegroundColor Cyan
