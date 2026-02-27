#!/bin/bash
# Adds readit.local and blocked domains (from domains.txt) to /etc/hosts

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAINS_FILE="$SCRIPT_DIR/../domains.txt"
READER="readit.local"

if [ ! -f "$DOMAINS_FILE" ]; then
  echo "No domains.txt found. Nothing to block."
  exit 0
fi

# Add reader domain
if grep -q "127.0.0.1 $READER" /etc/hosts; then
  echo "$READER already in /etc/hosts, skipping."
else
  echo "127.0.0.1 $READER" | sudo tee -a /etc/hosts > /dev/null
  echo "Added $READER → 127.0.0.1"
fi

# Add blocked domains from domains.txt
while IFS= read -r domain || [ -n "$domain" ]; do
  domain="$(echo "$domain" | xargs)"  # trim whitespace
  [ -z "$domain" ] && continue
  [[ "$domain" == \#* ]] && continue  # skip comments

  if grep -q "127.0.0.1 $domain" /etc/hosts; then
    echo "$domain already in /etc/hosts, skipping."
  else
    echo "127.0.0.1 $domain" | sudo tee -a /etc/hosts > /dev/null
    echo "Added $domain → 127.0.0.1"
  fi
done < "$DOMAINS_FILE"

sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null
echo "DNS cache flushed."
