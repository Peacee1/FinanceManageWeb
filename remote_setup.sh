#!/usr/bin/env bash
set -euo pipefail
# Existing servers are updated without recreating PostgreSQL or rewriting secrets.
# Provision a new host using the checklist in DEPLOYMENT.md first.
cd /home/ec2-user/FinanceManageWeb
exec bash remote_deploy.sh "${1:?Expected commit SHA is required}"
