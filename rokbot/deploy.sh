#!/usr/bin/env bash
set -euo pipefail
cd /home/ec2-user/FinanceManageWeb
sudo mkdir -p /usr/share/nginx/peacee1-rokbot
sudo cp rokbot/{index.html,style.css,app.js,admin.html,admin.js} /usr/share/nginx/peacee1-rokbot/
sudo cp -r rokbot/assets /usr/share/nginx/peacee1-rokbot/
sudo chmod -R a+rX /usr/share/nginx/peacee1-rokbot
if command -v selinuxenabled >/dev/null && selinuxenabled; then sudo chcon -R -t httpd_sys_content_t /usr/share/nginx/peacee1-rokbot; fi
if ! sudo test -f /etc/letsencrypt/live/rokbot.peacee1.io.vn/fullchain.pem; then
 sudo tee /etc/nginx/conf.d/rokbot.conf >/dev/null <<'NGINX'
server { listen 80; server_name rokbot.peacee1.io.vn; root /usr/share/nginx/peacee1-rokbot; location /.well-known/acme-challenge/ { try_files $uri =404; } location / { return 302 https://peacee1.io.vn/; } }
NGINX
 sudo nginx -t
 sudo systemctl reload nginx
 sudo certbot certonly --webroot -w /usr/share/nginx/peacee1-rokbot -d rokbot.peacee1.io.vn --non-interactive --agree-tos
fi
sudo cp rokbot/nginx.conf /etc/nginx/conf.d/rokbot.conf

sudo nginx -t
sudo systemctl reload nginx
