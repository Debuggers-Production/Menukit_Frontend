#!/bin/sh
set -e

cat <<EOF > /usr/share/nginx/html/config.js
window.APP_CONFIG = {
  API_URL: "${VITE_API_URL:-${API_URL:-}}",
  CUSTOMER_PROFILE_URL: "${VITE_CUSTOMER_PROFILE_URL:-${CUSTOMER_PROFILE_URL:-}}"
};
EOF

exec "$@"
