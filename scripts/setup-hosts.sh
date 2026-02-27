#!/bin/bash
# Adds blocked sites to /etc/hosts, redirecting to localhost

# Reader domain
READER="readit.local"

# Blocked domains
DOMAINS=(
  "reddit.com"
  "www.reddit.com"
  "instagram.com"
  "www.instagram.com"
  "facebook.com"
  "www.facebook.com"
)

# Add reader domain
if grep -q "127.0.0.1 $READER" /etc/hosts; then
  echo "$READER already in /etc/hosts, skipping."
else
  echo "127.0.0.1 $READER" | sudo tee -a /etc/hosts > /dev/null
  echo "Added $READER → 127.0.0.1"
fi

for domain in "${DOMAINS[@]}"; do
  if grep -q "127.0.0.1 $domain" /etc/hosts; then
    echo "$domain already in /etc/hosts, skipping."
  else
    echo "127.0.0.1 $domain" | sudo tee -a /etc/hosts > /dev/null
    echo "Added $domain → 127.0.0.1"
  fi
done

sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null
echo "DNS cache flushed."
