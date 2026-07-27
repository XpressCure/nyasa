# Nyasa EC2 Deployment

This guide deploys Nyasa on one Amazon EC2 instance:

- Nginx serves the React frontend.
- PM2 runs the Node API.
- MongoDB Atlas remains the database.
- AWS S3 stores uploaded bills.
- Razorpay handles wallet top-ups.

## Recommended EC2 Setup

- Ubuntu 22.04 LTS
- Node.js 20 LTS
- Nginx
- PM2
- Security group inbound:
  - `22` SSH from your IP
  - `80` HTTP from anywhere
  - `443` HTTPS from anywhere, after SSL is configured

## 1. Install Server Packages

```bash
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Clone Or Pull The Repository

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <your-github-repo-url> nyasa
cd nyasa
npm install
```

If the repo already exists:

```bash
cd /var/www/nyasa
git pull
npm install
```

## 3. Configure API Environment

Create `/var/www/nyasa/apps/api/.env`:

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=replace-with-long-random-secret
WEB_ORIGIN=http://your-domain-or-ec2-ip

STORAGE_DRIVER=s3
AWS_S3_BUCKET_NAME=xpresscure
AWS_S3_REGION=ap-south-1
AWS_S3_ACCESS_KEY_ID=your-rotated-access-key
AWS_S3_SECRET_ACCESS_KEY=your-rotated-secret-key
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false

RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=
```

## 4. Configure Web Environment

Create `/var/www/nyasa/apps/web/.env`:

```env
VITE_API_BASE_URL=http://your-domain-or-ec2-ip/api
```

After HTTPS is enabled, change both `WEB_ORIGIN` and `VITE_API_BASE_URL` to `https://...`.

## 5. Build Frontend

```bash
cd /var/www/nyasa
npm run build -w apps/web
```

## 6. Start API With PM2

```bash
cd /var/www/nyasa
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`.

## 7. Configure Nginx

```bash
sudo cp /var/www/nyasa/deploy/nginx-nyasa.conf /etc/nginx/sites-available/nyasa
sudo ln -sf /etc/nginx/sites-available/nyasa /etc/nginx/sites-enabled/nyasa
sudo nginx -t
sudo systemctl reload nginx
```

Open:

```text
http://your-domain-or-ec2-ip
```

## 8. Enable HTTPS

After your domain points to EC2:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Then update:

- `apps/api/.env` `WEB_ORIGIN=https://your-domain.com`
- `apps/web/.env` `VITE_API_BASE_URL=https://your-domain.com/api`

Rebuild and restart:

```bash
cd /var/www/nyasa
npm run build -w apps/web
pm2 restart nyasa-api
sudo systemctl reload nginx
```

## Deploy Updates

```bash
cd /var/www/nyasa
git pull
npm install
npm run build -w apps/web
pm2 restart nyasa-api
sudo systemctl reload nginx
```

## Health Checks

```bash
curl http://localhost:4000/api/health
curl http://your-domain-or-ec2-ip/api/health
pm2 logs nyasa-api
```
