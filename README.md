# ReadIt

A local epub reader that replaces distracting websites. Domains you choose are redirected to the reader, picking up where you left off. 

## Setup

Requires [mkcert](https://github.com/nicedave/mkcert) and Node.js.

```bash
# Install mkcert (one-time)
brew install mkcert
mkcert -install

# Install dependencies
npm install

# Generate TLS certs
mkdir -p certs
mkcert -cert-file certs/readit.pem -key-file certs/readit-key.pem \
  readit.local reddit.com www.reddit.com instagram.com www.instagram.com \
  facebook.com www.facebook.com localhost 127.0.0.1

# Add domains to /etc/hosts
npm run setup
```

## Usage

```bash
# Start in foreground
npm start

# Start in background (terminal can be closed)
npm run start:bg

# Stop background server
npm run stop

# View logs
npm run logs

# Open in browser
# https://readit.local
```

Drop `.epub` files into the `books/` folder. The reader remembers your position and text size.

## Blocked domains

Blocked domains are listed in `domains.txt` (one per line).

```bash
# Block a new domain (also adds www variant)
npm run block -- tiktok.com

# Unblock a domain
npm run unblock -- tiktok.com
```

After adding new domains, regenerate certs to include them:

```bash
mkcert -cert-file certs/readit.pem -key-file certs/readit-key.pem \
  readit.local localhost 127.0.0.1 $(cat domains.txt | tr '\n' ' ')
```

## Uninstall

```bash
# Remove domains from /etc/hosts
npm run teardown
```

