#!/bin/bash
# Add or remove a blocked domain
# Usage: manage-domain.sh block <domain>
#        manage-domain.sh unblock <domain>

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAINS_FILE="$SCRIPT_DIR/../domains.txt"
ACTION="$1"
DOMAIN="$2"

if [ -z "$ACTION" ] || [ -z "$DOMAIN" ]; then
  echo "Usage: $0 block|unblock <domain>"
  exit 1
fi

# Ensure domains.txt exists
touch "$DOMAINS_FILE"

case "$ACTION" in
  block)
    # Add to domains.txt if not already there
    if grep -qx "$DOMAIN" "$DOMAINS_FILE"; then
      echo "$DOMAIN is already blocked."
    else
      echo "$DOMAIN" >> "$DOMAINS_FILE"
      echo "Added $DOMAIN to domains.txt."
    fi

    # Add to /etc/hosts
    if ! grep -q "127.0.0.1 $DOMAIN" /etc/hosts; then
      echo "127.0.0.1 $DOMAIN" | sudo tee -a /etc/hosts > /dev/null
      echo "Added $DOMAIN → 127.0.0.1 in /etc/hosts."
    fi

    # Also block www variant if bare domain given
    if [[ "$DOMAIN" != www.* ]]; then
      WWW="www.$DOMAIN"
      if ! grep -qx "$WWW" "$DOMAINS_FILE"; then
        echo "$WWW" >> "$DOMAINS_FILE"
        echo "Added $WWW to domains.txt."
      fi
      if ! grep -q "127.0.0.1 $WWW" /etc/hosts; then
        echo "127.0.0.1 $WWW" | sudo tee -a /etc/hosts > /dev/null
        echo "Added $WWW → 127.0.0.1 in /etc/hosts."
      fi
    fi

    echo ""
    echo "NOTE: Regenerate certs to include the new domain:"
    echo "  mkcert -cert-file certs/readit.pem -key-file certs/readit-key.pem \\"
    echo "    readit.local localhost 127.0.0.1 \$(cat domains.txt | tr '\\n' ' ')"
    ;;

  unblock)
    # Remove from domains.txt
    if grep -qx "$DOMAIN" "$DOMAINS_FILE"; then
      sed -i '' "/^${DOMAIN//./\\.}$/d" "$DOMAINS_FILE"
      echo "Removed $DOMAIN from domains.txt."
    else
      echo "$DOMAIN is not in domains.txt."
    fi

    # Remove from /etc/hosts
    sudo sed -i '' "/^127\.0\.0\.1 ${DOMAIN//./\\.}$/d" /etc/hosts
    echo "Removed $DOMAIN from /etc/hosts."

    # Also remove www variant if bare domain given
    if [[ "$DOMAIN" != www.* ]]; then
      WWW="www.$DOMAIN"
      sed -i '' "/^${WWW//./\\.}$/d" "$DOMAINS_FILE"
      sudo sed -i '' "/^127\.0\.0\.1 ${WWW//./\\.}$/d" /etc/hosts
      echo "Removed $WWW from domains.txt and /etc/hosts."
    fi
    ;;

  *)
    echo "Unknown action: $ACTION"
    echo "Usage: $0 block|unblock <domain>"
    exit 1
    ;;
esac

# Flush DNS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null
echo "DNS cache flushed."
