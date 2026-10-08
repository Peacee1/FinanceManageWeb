#!/usr/bin/env bash
set -euo pipefail
cd /home/ec2-user/FinanceManageWeb
expected_commit=${1:?Expected commit SHA is required}
[[ $(git rev-parse HEAD) == "$expected_commit" ]] || { echo 'Unexpected checkout'; exit 1; }
[[ -z $(git status --porcelain --untracked-files=no) ]] || { echo 'Tracked server changes must be resolved'; exit 1; }
test -f backend/.env
release_dir="/home/ec2-user/finance-releases/$expected_commit"
mkdir -p "$release_dir"
chmod 700 /home/ec2-user/finance-releases "$release_dir"
cd backend
npm ci --omit=dev
# Preserve all configuration; replace the previously hard-coded signing key.
node <<'NODE'
const fs = require('fs');
const { randomBytes } = require('crypto');
let env = fs.readFileSync('.env', 'utf8');
const current = /^JWT_SECRET=(.*)$/m.exec(env)?.[1]?.trim();
if (!current || current.length < 32 || ['bi_mat_tren_server', 'secret_key_tam_thoi'].includes(current)) {
  const setting = `JWT_SECRET=${randomBytes(48).toString('hex')}`;
  env = /^JWT_SECRET=.*$/m.test(env) ? env.replace(/^JWT_SECRET=.*$/m, setting) : `${env.trimEnd()}
${setting}
`;
}
if (!/^INTERNAL_METRICS_TOKEN=.+$/m.test(env)) env += `\nINTERNAL_METRICS_TOKEN=${randomBytes(32).toString('hex')}\n`;
if (!/^PAYMENT_SECRET_KEY=.+$/m.test(env)) env += `\nPAYMENT_SECRET_KEY=${randomBytes(32).toString('hex')}\n`;
for (const [key, value] of Object.entries({ NODE_ENV: 'production', HOST: '127.0.0.1' })) {
  env = new RegExp(`^${key}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`) : `${env.trimEnd()}
${key}=${value}
`;
}
fs.writeFileSync('.env', env, { mode: 0o600 });
fs.chmodSync('.env', 0o600);
NODE
node <<'NODE' > "$release_dir/database.dump"
require('dotenv').config({ quiet: true });
const { spawnSync } = require('child_process');
const result = spawnSync('pg_dump', ['-Fc', '-h', process.env.DB_HOST || 'localhost', '-p', process.env.DB_PORT || '5432', '-U', process.env.DB_USER, process.env.DB_NAME], { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }, stdio: ['ignore', 'inherit', 'inherit'] });
process.exit(result.status ?? 1);
NODE
chmod 600 "$release_dir/database.dump"
npm run migrate
RUN_DB_TESTS=1 npm test
cd ../frontend
npm ci
npm run build
cp -R dist "$release_dir/html"
public_release="/usr/share/nginx/releases/$expected_commit"
sudo mkdir -p "$public_release"
sudo cp -R "$release_dir/html/." "$public_release/"
sudo chmod -R a+rX "$public_release"
if command -v selinuxenabled >/dev/null && selinuxenabled; then sudo chcon -R -t httpd_sys_content_t "$public_release"; fi
# Multipart evidence is limited to one 5 MB image by the authenticated API.
nginx_config=/etc/nginx/conf.d/quanlychitieu.conf
sudo cp "$nginx_config" "$release_dir/nginx.conf"
sudo sed -i 's/client_max_body_size 1M;/client_max_body_size 6M;/' "$nginx_config"
# Overwrite the client header: only the local trusted proxy declares TLS.
if sudo grep -q 'proxy_set_header X-Forwarded-Proto' "$nginx_config"; then
  sudo sed -i 's/proxy_set_header X-Forwarded-Proto.*;/proxy_set_header X-Forwarded-Proto $scheme;/' "$nginx_config"
else
  sudo sed -i '/proxy_set_header X-Real-IP/a\      proxy_set_header X-Forwarded-Proto $scheme;' "$nginx_config"
fi
if ! sudo nginx -t; then
  sudo cp "$release_dir/nginx.conf" "$nginx_config"
  exit 1
fi
sudo systemctl reload nginx
# Save the served frontend before switching to the new release.
previous_html=$(readlink -f /usr/share/nginx/html)
if [[ ! -L /usr/share/nginx/html ]]; then
  previous_html="/usr/share/nginx/html-before-$expected_commit"
  sudo mv /usr/share/nginx/html "$previous_html"
fi
sudo ln -s "$public_release" /usr/share/nginx/html-next
sudo mv -Tf /usr/share/nginx/html-next /usr/share/nginx/html
NODE_ENV=production pm2 restart backend-api --update-env
healthy=false
for attempt in {1..15}; do
  if curl --fail --silent http://127.0.0.1:5000/api/health; then healthy=true; break; fi
  sleep 2
done
if [[ "$healthy" != true ]]; then
  sudo ln -s "$previous_html" /usr/share/nginx/html-rollback
  sudo mv -Tf /usr/share/nginx/html-rollback /usr/share/nginx/html
  echo 'Backend health check failed; frontend restored. Backend needs investigation.'
  exit 1
fi
pm2 save
bash /home/ec2-user/FinanceManageWeb/beatmaker/deploy.sh "$release_dir"
echo "DEPLOYED $expected_commit"
