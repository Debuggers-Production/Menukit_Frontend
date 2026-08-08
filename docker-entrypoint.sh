#!/bin/sh
set -e

DEFAULT_API_URL="https://api.menukit.debuggerstechnologies.com"
DEFAULT_CUSTOMER_PROFILE_URL="https://menukit.debuggerstechnologies.com/customer"

API_VAL="${VITE_API_URL:-${API_URL:-$DEFAULT_API_URL}}"
PROFILE_VAL="${VITE_CUSTOMER_PROFILE_URL:-${CUSTOMER_PROFILE_URL:-$DEFAULT_CUSTOMER_PROFILE_URL}}"

cat <<EOF > /usr/share/nginx/html/config.js
window.APP_CONFIG = {
  API_URL: "${API_VAL}",
  CUSTOMER_PROFILE_URL: "${PROFILE_VAL}"
};
EOF

exec "$@"
