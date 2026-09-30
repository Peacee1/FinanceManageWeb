param(
  [string]$KeyPath = "C:/Users/Admin/Downloads/webquanlychitieu/peacee1_financial_management_key.pem",
  [string]$Server = "13.212.179.88",
  [string]$SshUser = "ec2-user"
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $KeyPath)) { throw "SSH key not found" }
$changes = git status --porcelain
if ($LASTEXITCODE -ne 0 -or $changes) { throw "Commit changes before deployment" }
$branch = git branch --show-current
if ($branch -ne "main") { throw "Deploy from main after validation" }
$commit = git rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw "Cannot resolve Git commit" }
git push origin main
if ($LASTEXITCODE -ne 0) { throw "Git push failed" }
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -i $KeyPath "${SshUser}@${Server}" "cd /home/ec2-user/FinanceManageWeb && git pull --ff-only origin main && bash remote_deploy.sh $commit"
if ($LASTEXITCODE -ne 0) { throw "Deployment failed; inspect server state" }
