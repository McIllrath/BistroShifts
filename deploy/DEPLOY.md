Deployment steps (minimal)

1) Clone the repo onto your VPS, place it under `/var/www/bistro` (example)

2) Install runtime packages

```bash
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
```

3) Build client and copy to `server/public`

```bash
cd /var/www/bistro/client
npm ci
npm run build
mkdir -p ../server/public
rm -rf ../server/public/*
cp -r dist/* ../server/public/
```

4) Install server deps and start

```bash
cd /var/www/bistro/server
npm ci
# Using systemd (see deploy/bistro.service)
sudo cp deploy/bistro.service /etc/systemd/system/bistro.service
sudo systemctl daemon-reload
sudo systemctl enable --now bistro
# or run directly
node index.js
```

5) nginx config

```bash
sudo cp deploy/nginx/bistro.conf /etc/nginx/sites-available/bistro
sudo ln -s /etc/nginx/sites-available/bistro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# Obtain TLS certificates for your domain (replace with your actual domains)
sudo certbot --nginx -d bistro-otzenrath.de -d www.bistro-otzenrath.de
```

Notes:
- Replace `bistro-otzenrath.de` and `www.bistro-otzenrath.de` with the domain(s) you will use (these are the example values added here).
- Ensure environment variables in `/etc/systemd/system/bistro.service` or `/etc/environment` (JWT_SECRET, DATABASE_URL if needed).
- Add cron-backed backups for `server/db/database.sqlite`.
