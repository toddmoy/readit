#!/bin/bash
# Removes readit.local and blocked domains (from domains.txt) from /etc/hosts

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAINS_FILE="$SCRIPT_DIR/../domains.txt"
READER="readit.local"

# Remove reader domain
sudo sed -i '' "/^127\.0\.0\.1 ${READER//./\\.}$/d" /etc/hosts

# Remove blocked domains from domains.txt
if [ -f "$DOMAINS_FILE" ]; then
  while IFS= read -r domain || [ -n "$domain" ]; do
    domain="$(echo "$domain" | xargs)"
    [ -z "$domain" ] && continue
    [[ "$domain" == \#* ]] && continue
    sudo sed -i '' "/^127\.0\.0\.1 ${domain//./\\.}$/d" /etc/hosts
  done < "$DOMAINS_FILE"
fi

sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null
echo "All sites restored to normal."
