# Nyasa Product Preview Deployment

This deployment runs the public-product branch beside the existing family application on the same EC2 instance.

## Isolation

| Component | Existing family version | Product preview |
| --- | --- | --- |
| Git checkout | `/home/ubuntu/nyasa` | `/home/ubuntu/nyasa-product` |
| Branch | `main` | `codex/product-platform-mvp` |
| PM2 name | `nyasa-api` | `nyasa-product-api` |
| API port | `4100` | `4200` |
| MongoDB cluster | existing Atlas cluster | separate product Atlas cluster |
| MongoDB database | existing database | `nyasa_product` in the product cluster |
| Web root | `/var/www/nyasa` | `/var/www/nyasa-product` |
| Hostname | `nyasa.xpresscure.com` | `product.nyasa.xpresscure.com` |

The installer never restarts, deletes, or reloads `nyasa-api`. It rejects the deployment if the family and product MongoDB URIs are identical, and verifies that both PM2 applications exist afterward.

## Product cluster secret

Create the secret file on EC2 after the separate Atlas cluster is ready:

```bash
mkdir -p /home/ubuntu/.config
nano /home/ubuntu/.config/nyasa-product.env
chmod 600 /home/ubuntu/.config/nyasa-product.env
```

Its content is:

```env
NYASA_PRODUCT_MONGODB_URI='mongodb+srv://PRODUCT_USER:PRODUCT_PASSWORD@PRODUCT_CLUSTER/nyasa_product?retryWrites=true&w=majority'
```

Use a product-only Atlas database user. Do not reuse the family cluster URI or user.

## Deploy

From the existing server checkout:

```bash
cd /home/ubuntu/nyasa
git fetch origin codex/product-platform-mvp
git show origin/codex/product-platform-mvp:deploy/install-product-preview.sh > /tmp/install-product-preview.sh
chmod 700 /tmp/install-product-preview.sh
/tmp/install-product-preview.sh
```

The product worktree receives a one-time copy of the non-database API settings so existing S3 and application configuration remain server-side. Its fallback MongoDB URI is deliberately invalid. PM2 injects the separate product-cluster URI from the protected secret file and overrides the port, database name, and browser origin.

## DNS and HTTPS

Create an `A` record for `product.nyasa.xpresscure.com` pointing to `3.108.109.100`, then run:

```bash
sudo certbot --apache -d product.nyasa.xpresscure.com
```

## Verify isolation

```bash
pm2 list
curl http://127.0.0.1:4100/api/health
curl http://127.0.0.1:4200/api/health
curl https://nyasa.xpresscure.com/api/health
curl https://product.nyasa.xpresscure.com/api/health
```

Expected PM2 applications:

```text
nyasa-api          online
nyasa-product-api  online
```
