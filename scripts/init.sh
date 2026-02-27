#!/bin/bash
# Creates required directories and default config

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

mkdir -p "$ROOT_DIR/books"
mkdir -p "$ROOT_DIR/certs"

# Create default domains.txt if it doesn't exist
if [ ! -f "$ROOT_DIR/domains.txt" ]; then
  cat > "$ROOT_DIR/domains.txt" << 'EOF'
reddit.com
www.reddit.com
instagram.com
www.instagram.com
facebook.com
www.facebook.com
EOF
  echo "Created domains.txt with default blocked domains."
fi
