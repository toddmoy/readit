#!/bin/bash
# Removes blocked sites from /etc/hosts

DOMAINS=(
  "readit.local"
  "reddit.com"
  "www.reddit.com"
  "instagram.com"
  "www.instagram.com"
  "facebook.com"
  "www.facebook.com"
)

for domain in "${DOMAINS[@]}"; do
  sudo sed -i '' "/^127\.0\.0\.1 ${domain//./\\.}$/d" /etc/hosts
done

sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null
echo "All sites restored to normal."
