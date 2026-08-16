# Production go-live — EVA Green Corner

This app uses **SQLite** (`data/community.sqlite`) and **local file uploads** (`public/uploads`).  
You need a **Node.js 22 host with persistent disk** (VPS or Docker).  
Do **not** deploy to Cloudflare Workers / pure serverless without a database rewrite.

Recommended: **Ubuntu VPS** (DigitalOcean, Hostinger VPS, AWS Lightsail, Contabo) **or Docker Compose** on that VPS.

---

## 1) Before you deploy (checklist)

1. Buy/point a domain (example: `evagreencorner.com`).
2. Choose a host with **persistent storage**.
3. Prepare secrets:
   - Strong `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   - `VITE_APP_URL=https://your-domain.com`
   - `OPEN_CHARGE_MAP_API_KEY` (optional but useful)
   - Email via Resend or SMTP (login emails)
4. Locally test a production build:

```bash
cd earth-pathfinder-pro
cp .env.production.example .env
# edit .env — set real domain + strong admin password
npm ci
npm run build
npm start
```

Open `http://localhost:3000` and confirm home + `/admin` login work.

---

## 2) Option A — Docker Compose (easiest on a VPS)

### On your laptop

```bash
# Push code to GitHub first (recommended)
git add .
git commit -m "Prepare production deploy"
git push origin main
```

### On the VPS (Ubuntu)

```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
# log out/in once

git clone YOUR_GITHUB_REPO_URL eva
cd eva/earth-pathfinder-pro   # or repo root if this folder IS the repo

cp .env.production.example .env
nano .env   # set VITE_APP_URL, ADMIN_*, keys, email

docker compose up -d --build
docker compose logs -f
```

App listens on port **3000**. Put Nginx + SSL in front (step 4).

Data persists in Docker volumes `eva_data` and `eva_uploads`.

---

## 3) Option B — Node + PM2 (no Docker)

```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

git clone YOUR_GITHUB_REPO_URL eva
cd eva/earth-pathfinder-pro

cp .env.production.example .env
nano .env

npm ci
npm run build

sudo npm i -g pm2
pm2 start npm --name eva -- start
pm2 save
pm2 startup
```

Keep these folders writable and backed up:

- `data/` → SQLite DB
- `public/uploads/` → images from admin/blog/jobs

---

## 4) Domain + HTTPS (Nginx)

Point DNS:

| Type | Name | Value |
|------|------|--------|
| A | `@` | your VPS IP |
| A | `www` | your VPS IP |

Nginx reverse proxy:

```nginx
server {
  listen 80;
  server_name evagreencorner.com www.evagreencorner.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25m;
  }
}
```

Enable SSL:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo ln -s /etc/nginx/sites-available/eva /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d evagreencorner.com -d www.evagreencorner.com
```

---

## 5) After go-live (admin)

1. Open `https://your-domain.com/admin` → login with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. **Home page** — confirm CMS content.
3. **Modules & SEO** — set titles/descriptions for main URLs.
4. **Analytics & scripts** — paste GA (`G-…`) / GTM / schema.
5. Change admin password in `.env`, restart app, and keep `.env` private.
6. Submit sitemap in Google Search Console: `https://your-domain.com/sitemap.xml`.

---

## 6) Backups (required)

SQLite + uploads are your production data.

Daily (example cron):

```bash
# backup DB
cp /path/to/app/data/community.sqlite /backups/community-$(date +%F).sqlite
# backup uploads
tar -czf /backups/uploads-$(date +%F).tgz -C /path/to/app/public uploads
```

Or for Docker:

```bash
docker compose exec web sh -c 'cp /app/data/community.sqlite /app/data/community-backup.sqlite'
# then copy volume / bind-mount off the server
```

---

## 7) Updates (redeploy)

```bash
cd /path/to/app
git pull
# Docker:
docker compose up -d --build
# or PM2:
npm ci && npm run build && pm2 restart eva
```

`VITE_*` values are baked in at **build** time. If you change `VITE_APP_URL` or brand envs, rebuild.

---

## 8) What not to use (with current code)

| Host | Why |
|------|-----|
| Cloudflare Workers (default Lovable target) | No durable local SQLite / filesystem |
| Vercel / Netlify serverless only | Ephemeral disk; DB/uploads lost |
| Shared PHP hosting | Not a Node SSR app |

If you later want serverless, the DB must move to Postgres/Turso and uploads to S3 — that is a separate project.

---

## Quick smoke test after deploy

- [ ] `https://domain/` loads
- [ ] `/find-chargers` works
- [ ] `/admin` login works
- [ ] Upload an image in Blog or Jobs
- [ ] Home CMS save reflects on `/`
- [ ] Analytics ID shows in page source / GA realtime
- [ ] `sitemap.xml` returns 200

Need help choosing a host? Prefer **Hostinger VPS / DigitalOcean Droplet ($6–12/mo)** + Docker Compose + the Nginx steps above.
