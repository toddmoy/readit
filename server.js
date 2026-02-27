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

// HTTPS on port 443 for blocked domains (via /etc/hosts)
const tlsOpts = {
  key: fs.readFileSync(path.join(CERTS_DIR, 'readit-key.pem')),
  cert: fs.readFileSync(path.join(CERTS_DIR, 'readit.pem')),
};

https.createServer(tlsOpts, app).listen(443, () => {
  console.log('Listening on port 443 (blocked domains)');
});

// HTTP on port 3141 for direct access
app.listen(PORT, () => {
  console.log(`ReadIt running at https://readit.local\n`);

  // Check /etc/hosts for domains routing to localhost
  try {
    const hosts = fs.readFileSync('/etc/hosts', 'utf-8');
    const blocked = hosts
      .split('\n')
      .filter(line => /^127\.0\.0\.1\s+/.test(line) && !line.includes('localhost') && !line.includes('readit.local'))
      .map(line => line.split(/\s+/)[1]);

    if (blocked.length > 0) {
      console.log('Blocked domains:');
      blocked.forEach(d => console.log(`  → ${d}`));
      console.log('');
    }
  } catch (e) {
    // ignore if hosts file can't be read
  }
});
