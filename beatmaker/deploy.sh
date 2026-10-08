#!/usr/bin/env bash
set -euo pipefail
cd /home/ec2-user/FinanceManageWeb
release_dir=${1:?Release directory required}
sudo mkdir -p /usr/share/nginx/peacee1-beatmaker
sudo cp beatmaker/{index.html,style.css,app.js,drums.js,melody.js,project.js} /usr/share/nginx/peacee1-beatmaker/
sudo chmod -R a+rX /usr/share/nginx/peacee1-beatmaker
if command -v selinuxenabled >/dev/null && selinuxenabled; then sudo chcon -R -t httpd_sys_content_t /usr/share/nginx/peacee1-beatmaker; fi
if ! sudo test -f /etc/letsencrypt/live/beatmaker.peacee1.io.vn/fullchain.pem; then
 sudo tee /etc/nginx/conf.d/beatmaker.conf >/dev/null <<'NGINX'
server {
 listen 80;
 server_name beatmaker.peacee1.io.vn;
 root /usr/share/nginx/peacee1-beatmaker;
 location /.well-known/acme-challenge/ { try_files $uri =404; }
 location / { return 302 https://peacee1.io.vn/; }
}
NGINX
 sudo nginx -t
 sudo systemctl reload nginx
 sudo certbot certonly --webroot -w /usr/share/nginx/peacee1-beatmaker -d beatmaker.peacee1.io.vn --non-interactive --agree-tos
fi
sudo cp beatmaker/nginx.conf /etc/nginx/conf.d/beatmaker.conf
sudo cp /usr/share/nginx/peacee1-portal/index.html "$release_dir/portal-before.html"
sudo cp /usr/share/nginx/peacee1-portal/auth.js "$release_dir/auth-before.js"
sudo cp portal/index.html /usr/share/nginx/peacee1-portal/index.html
sudo cp portal/shared-auth.js /usr/share/nginx/peacee1-portal/auth.js
sudo nginx -t
sudo systemctl reload nginx
