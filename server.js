const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 3141;
const BOOKS_DIR = path.join(__dirname, 'books');
const CERTS_DIR = path.join(__dirname, 'certs');
const STATE_FILE = path.join(__dirname, 'state.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { lastBook: null, textSize: 100, positions: {} };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/books', express.static(BOOKS_DIR));

// API: list available epub files
app.get('/api/books', (req, res) => {
  const files = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.epub'));
  res.json(files);
});

// API: get reading state (shared across all domains)
app.get('/api/state', (req, res) => {
  res.json(readState());
});

// API: update reading state (merges into existing)
app.post('/api/state', (req, res) => {
  const current = readState();
  const update = req.body;

  if (update.lastBook !== undefined) current.lastBook = update.lastBook;
  if (update.textSize !== undefined) current.textSize = update.textSize;
  if (update.positions) {
    current.positions = { ...current.positions, ...update.positions };
  }

  writeState(current);
  res.json(current);
});

// Catch-all: any unmatched route (e.g. reddit.com/r/programming) serves the app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function getBlockedDomains() {
  try {
    const hosts = fs.readFileSync('/etc/hosts', 'utf-8');
    return hosts
      .split('\n')
      .filter(line => /^127\.0\.0\.1\s+/.test(line) && !line.includes('localhost') && !line.includes('readit.local'))
      .map(line => line.split(/\s+/)[1]);
  } catch {
    return [];
  }
}

function getBooks() {
  try {
    return fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.epub'));
  } catch {
    return [];
  }
}

function formatBookName(filename) {
  return filename.replace(/\.epub$/, '').replace(/-/g, ' ');
}

function printStartupBanner() {
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';

  const books = getBooks();
  const blocked = getBlockedDomains();

  const label = (text) => `${dim}${text}${reset}`;
  const pad = 10; // label column width

  const lines = [];
  lines.push(`${bold}ReadIt${reset}`);
  lines.push(null); // separator
  lines.push('');
  lines.push(`${label('Address'.padEnd(pad))}https://readit.local`);
  lines.push(`${label('Port 443'.padEnd(pad))}blocked domains (HTTPS)`);
  lines.push(`${label(('Port ' + PORT).padEnd(pad))}direct access (HTTP)`);
  lines.push('');
  lines.push(`${label('Books'.padEnd(pad))}${dim}${BOOKS_DIR}${reset}`);
  if (books.length > 0) {
    books.forEach(b => lines.push(`${''.padEnd(pad)}${formatBookName(b)}`));
  } else {
    lines.push(`${''.padEnd(pad)}${dim}(none)${reset}`);
  }
  lines.push('');
  lines.push(`${label('Blocked'.padEnd(pad))}${blocked.length > 0 ? blocked[0] : `${dim}(none)${reset}`}`);
  if (blocked.length > 1) {
    blocked.slice(1).forEach(d => lines.push(`${''.padEnd(pad)}${d}`));
  }
  lines.push('');

  // Calculate box width from visible (non-ANSI) content
  const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
  const contentWidth = Math.max(...lines.filter(l => l !== null).map(l => stripAnsi(l).length));
  const innerWidth = contentWidth + 4; // 2 padding each side

  const top = `┌${'─'.repeat(innerWidth)}┐`;
  const bot = `└${'─'.repeat(innerWidth)}┘`;
  const sep = `├${'─'.repeat(innerWidth)}┤`;
  const row = (text) => {
    const visible = stripAnsi(text).length;
    const padding = innerWidth - 4 - visible;
    return `│  ${text}${' '.repeat(Math.max(0, padding))}  │`;
  };

  console.log('');
  console.log(top);
  for (const line of lines) {
    if (line === null) {
      console.log(sep);
    } else {
      console.log(row(line));
    }
  }
  console.log(bot);
  console.log(`  ${dim}Press Ctrl+C to stop${reset}`);
  console.log('');
}

// HTTPS on port 443 for blocked domains (via /etc/hosts)
const tlsOpts = {
  key: fs.readFileSync(path.join(CERTS_DIR, 'readit-key.pem')),
  cert: fs.readFileSync(path.join(CERTS_DIR, 'readit.pem')),
};

const httpsServer = https.createServer(tlsOpts, app);
httpsServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port 443 is already in use — server is likely already running.');
  } else {
    throw err;
  }
});
httpsServer.listen(443);

// HTTP on port 3141 for direct access
const httpServer = app.listen(PORT);
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use — server is likely already running at https://readit.local`);
  } else {
    throw err;
  }
});
httpServer.on('listening', () => {
  printStartupBanner();
});
