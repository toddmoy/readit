const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');
const express = require('express');

const app = express();
const PORT = 3141;
const BOOKS_DIR = path.join(__dirname, 'books');
const CERTS_DIR = path.join(__dirname, 'certs');
const STATE_FILE = path.join(__dirname, 'state.json');
const DOMAINS_FILE = path.join(__dirname, 'domains.txt');
const HOSTS_FILE = '/etc/hosts';

function getDomainList() {
  try {
    return fs.readFileSync(DOMAINS_FILE, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

function setupHosts() {
  const hosts = fs.readFileSync(HOSTS_FILE, 'utf-8');
  const entries = ['readit.local', ...getDomainList()];
  const toAdd = entries.filter(domain => !hosts.includes(`127.0.0.1 ${domain}`));

  if (toAdd.length > 0) {
    const lines = toAdd.map(d => `127.0.0.1 ${d}`).join('\n');
    fs.appendFileSync(HOSTS_FILE, '\n' + lines + '\n');
  }

  execSync('dscacheutil -flushcache && killall -HUP mDNSResponder', { stdio: 'ignore' });
}

function teardownHosts() {
  const entries = ['readit.local', ...getDomainList()];
  let hosts = fs.readFileSync(HOSTS_FILE, 'utf-8');

  for (const domain of entries) {
    const escaped = domain.replace(/\./g, '\\.');
    const re = new RegExp(`^127\\.0\\.0\\.1\\s+${escaped}\\s*$`, 'gm');
    hosts = hosts.replace(re, '');
  }

  // Clean up consecutive blank lines left behind
  hosts = hosts.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(HOSTS_FILE, hosts);

  execSync('dscacheutil -flushcache && killall -HUP mDNSResponder', { stdio: 'ignore' });
}

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

// Block domains on startup
setupHosts();

// Clean up on exit (SIGTERM for non-interactive shutdown; SIGINT handled by TUI)
process.on('SIGTERM', () => {
  teardownHosts();
  process.exit();
});

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
  require('./tui');
});

module.exports = {
  setupHosts,
  teardownHosts,
  getDomainList,
  getBlockedDomains,
  getBooks,
  formatBookName,
  PORT,
  BOOKS_DIR,
  CERTS_DIR,
  DOMAINS_FILE,
  httpsServer,
};
