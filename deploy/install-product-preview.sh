#!/usr/bin/env bash
set -euo pipefail

legacy_repo="/home/ubuntu/nyasa"
product_repo="/home/ubuntu/nyasa-product"
product_web_root="/var/www/nyasa-product"
product_branch="codex/product-platform-mvp"
product_secret_file="/home/ubuntu/.config/nyasa-product.env"

if [[ ! -d "${legacy_repo}/.git" ]]; then
  echo "Expected the existing Nyas checkout at ${legacy_repo}." >&2
  exit 1
fi

if [[ ! -f "${product_secret_file}" ]]; then
  echo "Create ${product_secret_file} with NYASA_PRODUCT_MONGODB_URI for the separate Atlas cluster." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "${product_secret_file}"
set +a

if [[ -z "${NYASA_PRODUCT_MONGODB_URI:-}" ]]; then
  echo "NYASA_PRODUCT_MONGODB_URI is missing from ${product_secret_file}." >&2
  exit 1
fi

legacy_mongodb_uri="$(sed -n 's/^MONGODB_URI=//p' "${legacy_repo}/apps/api/.env" | head -n 1)"
if [[ -n "${legacy_mongodb_uri}" && "${NYASA_PRODUCT_MONGODB_URI}" == "${legacy_mongodb_uri}" ]]; then
  echo "The product and family MongoDB URIs are identical; refusing a non-isolated deployment." >&2
  exit 1
fi

cd "${legacy_repo}"
git fetch origin "${product_branch}"

if [[ ! -e "${product_repo}" ]]; then
  git worktree add --detach "${product_repo}" "origin/${product_branch}"
elif [[ -f "${product_repo}/.git" ]]; then
  git -C "${product_repo}" status --porcelain
  if [[ -n "$(git -C "${product_repo}" status --porcelain)" ]]; then
    echo "Product checkout has local changes; refusing to overwrite it." >&2
    exit 1
  fi
  git -C "${product_repo}" checkout --detach "origin/${product_branch}"
else
  echo "${product_repo} exists but is not the expected Git worktree." >&2
  exit 1
fi

if [[ ! -f "${product_repo}/apps/api/.env" ]]; then
  cp "${legacy_repo}/apps/api/.env" "${product_repo}/apps/api/.env"
  sed -i 's|^MONGODB_URI=.*|MONGODB_URI=mongodb://127.0.0.1:1/invalid-product-fallback|' "${product_repo}/apps/api/.env"
fi

cd "${product_repo}"
npm ci
VITE_API_BASE_URL=/api npm run build --workspace @nyasa/web

pm2 startOrReload ecosystem.product.config.cjs --only nyasa-product-api --update-env
pm2 save

sudo install -d -o www-data -g www-data "${product_web_root}"
sudo rsync -a --delete -- "${product_repo}/apps/web/dist/" "${product_web_root}/"
sudo chown -R www-data:www-data "${product_web_root}"

sudo cp "${product_repo}/deploy/apache-nyasa-product.conf" /etc/apache2/sites-available/nyasa-product.conf
sudo a2enmod proxy proxy_http
sudo a2ensite nyasa-product.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

curl --fail --silent --show-error http://127.0.0.1:4200/api/health
pm2 describe nyasa-api >/dev/null
pm2 describe nyasa-product-api >/dev/null

echo
echo "Product preview deployed without restarting nyasa-api."
echo "Next: point product.nyasa.xpresscure.com to this server and enable TLS."
