# Production domain

Configured on 2026-10-01:

- `peacee1.io.vn` A record: `13.212.179.88`.
- `www.peacee1.io.vn` CNAME: `peacee1.io.vn`.
- Both names have a Let's Encrypt certificate installed by Certbot's Nginx plugin.
- HTTP redirects to HTTPS. Frontend and `/api/` share the same origin.
- Nginx configuration: `/etc/nginx/conf.d/quanlychitieu.conf`.
- Certificate renewal: `certbot-renew.timer`, enabled with systemd.
- Backend private environment: `PAYMENT_PUBLIC_URL=https://peacee1.io.vn`; `CORS_ORIGINS=https://peacee1.io.vn,https://www.peacee1.io.vn`.

Preserve the Nginx certificate directives and private backend environment during deployments. Never commit certificate private keys or bank webhook secrets.

Check `sudo systemctl status certbot-renew.timer`, `sudo certbot renew --dry-run`, and `curl --fail https://peacee1.io.vn/api/health` after infrastructure changes. Keep inbound TCP 80 open for renewal validation and TCP 443 open for HTTPS.

HTTPS enables bank connection configuration; actual incoming payment verification still requires the owner's bank account connected to SePay and its Live webhook configured using the URL and authentication information shown by the business bank settings. Do not enable a connection solely because HTTPS is available.
