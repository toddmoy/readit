'use strict';

const React = require('react');
const { useState, useEffect } = React;
const { render, Box, Text, useInput, useApp } = require('ink');
const TextInput = require('ink-text-input').default || require('ink-text-input');
const fs = require('fs');
const { execSync } = require('child_process');

const path = require('path');

const {
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
} = require('./server');

// --- Domain helpers ---

function addDomain(domain) {
  const domains = getDomainList();
  const toAdd = [];

  if (!domains.includes(domain)) {
    toAdd.push(domain);
  }
  // Auto-add www. variant for bare domains
  if (!domain.startsWith('www.')) {
    const www = 'www.' + domain;
    if (!domains.includes(www)) {
      toAdd.push(www);
    }
  }

  if (toAdd.length === 0) return;

  fs.appendFileSync(DOMAINS_FILE, toAdd.join('\n') + '\n');

  // Add /etc/hosts entries
  const hosts = fs.readFileSync('/etc/hosts', 'utf-8');
  const newEntries = toAdd
    .filter(d => !hosts.includes('127.0.0.1 ' + d))
    .map(d => '127.0.0.1 ' + d);

  if (newEntries.length > 0) {
    fs.appendFileSync('/etc/hosts', '\n' + newEntries.join('\n') + '\n');
  }

  execSync('dscacheutil -flushcache && killall -HUP mDNSResponder', { stdio: 'ignore' });
  regenerateCerts();
}

function removeDomain(domain) {
  // Determine all variants to remove
  const toRemove = [domain];
  if (!domain.startsWith('www.')) {
    toRemove.push('www.' + domain);
  } else {
    // If removing www.x.com, also remove x.com
    toRemove.push(domain.replace(/^www\./, ''));
  }

  // Remove from domains.txt
  let content = fs.readFileSync(DOMAINS_FILE, 'utf-8');
  for (const d of toRemove) {
    const escaped = d.replace(/\./g, '\\.');
    content = content.replace(new RegExp('^' + escaped + '\\s*$', 'gm'), '');
  }
  content = content.replace(/\n{2,}/g, '\n').replace(/^\n/, '');
  fs.writeFileSync(DOMAINS_FILE, content);

  // Remove from /etc/hosts
  let hosts = fs.readFileSync('/etc/hosts', 'utf-8');
  for (const d of toRemove) {
    const escaped = d.replace(/\./g, '\\.');
    hosts = hosts.replace(new RegExp('^127\\.0\\.0\\.1\\s+' + escaped + '\\s*$', 'gm'), '');
  }
  hosts = hosts.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync('/etc/hosts', hosts);

  execSync('dscacheutil -flushcache && killall -HUP mDNSResponder', { stdio: 'ignore' });
  regenerateCerts();
}

// --- Cert helpers ---

function regenerateCerts() {
  const domains = getDomainList();
  const certFile = path.join(CERTS_DIR, 'readit.pem');
  const keyFile = path.join(CERTS_DIR, 'readit-key.pem');

  const allHosts = ['readit.local', 'localhost', '127.0.0.1', ...domains];
  execSync(
    `mkcert -cert-file ${certFile} -key-file ${keyFile} ${allHosts.join(' ')}`,
    { stdio: 'ignore' }
  );

  // Hot-reload the HTTPS server's TLS context
  httpsServer.setSecureContext({
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
  });
}

// --- Components ---

const e = React.createElement;

function Banner({ blocked, books }) {
  const pad = 10;

  const lines = [];
  lines.push({ text: 'ReadIt', bold: true });
  lines.push(null); // separator
  lines.push({ text: '' });
  lines.push({ label: 'Address', value: 'https://readit.local' });
  lines.push({ label: 'Port 443', value: 'blocked domains (HTTPS)' });
  lines.push({ label: 'Port ' + PORT, value: 'direct access (HTTP)' });
  lines.push({ text: '' });
  lines.push({ label: 'Books', value: BOOKS_DIR, dim: true });
  if (books.length > 0) {
    books.forEach(b => lines.push({ text: ''.padEnd(pad) + formatBookName(b) }));
  } else {
    lines.push({ text: ''.padEnd(pad) + '(none)', dim: true });
  }
  lines.push({ text: '' });
  if (blocked.length > 0) {
    lines.push({ label: 'Blocked', value: blocked[0] });
    blocked.slice(1).forEach(d => lines.push({ text: ''.padEnd(pad) + d }));
  } else {
    lines.push({ label: 'Blocked', value: '(none)', dim: true });
  }
  lines.push({ text: '' });

  // Calculate widths
  const visibleWidth = (line) => {
    if (line === null) return 0;
    if (line.label) return line.label.padEnd(pad).length + (line.value || '').length;
    return (line.text || '').length;
  };
  const innerWidth = Math.max(...lines.map(visibleWidth)) + 4;

  const top = '\u250c' + '\u2500'.repeat(innerWidth) + '\u2510';
  const bot = '\u2514' + '\u2500'.repeat(innerWidth) + '\u2518';
  const sep = '\u251c' + '\u2500'.repeat(innerWidth) + '\u2524';

  const renderRow = (line, i) => {
    if (line === null) {
      return e(Text, { key: i }, sep);
    }

    let content;
    const visible = visibleWidth(line);
    const rightPad = ' '.repeat(Math.max(0, innerWidth - 4 - visible));

    if (line.label) {
      content = e(Box, { key: i },
        e(Text, null, '\u2502  '),
        e(Text, { dimColor: true }, line.label.padEnd(pad)),
        e(Text, { dimColor: !!line.dim }, line.value),
        e(Text, null, rightPad + '  \u2502')
      );
    } else if (line.bold) {
      content = e(Box, { key: i },
        e(Text, null, '\u2502  '),
        e(Text, { bold: true }, line.text),
        e(Text, null, rightPad + '  \u2502')
      );
    } else {
      content = e(Box, { key: i },
        e(Text, null, '\u2502  '),
        e(Text, { dimColor: !!line.dim }, line.text),
        e(Text, null, rightPad + '  \u2502')
      );
    }

    return content;
  };

  return e(Box, { flexDirection: 'column' },
    e(Text, null, ''),
    e(Text, null, top),
    ...lines.map(renderRow),
    e(Text, null, bot)
  );
}

function RemoveMode({ blocked, onRemove, onCancel }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter to show only bare domains (not www. variants) for cleaner selection
  const bareDomains = blocked.filter(d => !d.startsWith('www.'));
  const displayDomains = bareDomains.length > 0 ? bareDomains : blocked;

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onRemove(displayDomains[selectedIndex]);
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(displayDomains.length - 1, i + 1));
    }
  });

  if (displayDomains.length === 0) {
    return e(Box, { flexDirection: 'column', marginLeft: 2 },
      e(Text, { dimColor: true }, 'No domains to remove. Press escape to cancel.')
    );
  }

  return e(Box, { flexDirection: 'column', marginLeft: 2 },
    e(Text, { bold: true }, 'Remove domain (↑↓ select, enter confirm, esc cancel):'),
    e(Text, null, ''),
    ...displayDomains.map((d, i) =>
      e(Text, { key: d },
        i === selectedIndex ? '  ▸ ' : '    ',
        e(Text, { bold: i === selectedIndex, color: i === selectedIndex ? 'red' : undefined }, d),
        i === selectedIndex && !d.startsWith('www.')
          ? e(Text, { dimColor: true }, '  (+ www.' + d + ')')
          : null
      )
    )
  );
}

function App() {
  const { exit } = useApp();
  const [mode, setMode] = useState('main'); // main | add | remove
  const [inputValue, setInputValue] = useState('');
  const [blocked, setBlocked] = useState(getBlockedDomains());
  const [books] = useState(getBooks());
  const [message, setMessage] = useState(null);

  const refresh = () => setBlocked(getBlockedDomains());

  useInput((input, key) => {
    if (mode !== 'main') return;

    if (input === 'a') {
      setMode('add');
      setMessage(null);
    } else if (input === 'd') {
      setMode('remove');
      setMessage(null);
    } else if (input === 'q' || (key.ctrl && input === 'c')) {
      teardownHosts();
      exit();
    }
  });

  const handleAddSubmit = (value) => {
    const domain = value.trim();
    if (domain) {
      addDomain(domain);
      refresh();
      const wwwNote = !domain.startsWith('www.') ? ' (+ www.' + domain + ')' : '';
      setMessage('Added ' + domain + wwwNote);
    }
    setInputValue('');
    setMode('main');
  };

  const handleRemove = (domain) => {
    removeDomain(domain);
    refresh();
    const wwwNote = !domain.startsWith('www.') ? ' (+ www.' + domain + ')' : '';
    setMessage('Removed ' + domain + wwwNote);
    setMode('main');
  };

  const handleRemoveCancel = () => {
    setMode('main');
  };

  return e(Box, { flexDirection: 'column' },
    e(Banner, { blocked, books }),
    e(Text, null, ''),

    // Hint bar
    mode === 'main' && e(Box, { marginLeft: 2 },
      e(Text, { dimColor: true }, '[a] add  [d] remove  [q] quit')
    ),

    // Status message
    message && mode === 'main' && e(Box, { marginLeft: 2 },
      e(Text, { color: 'green' }, message)
    ),

    // Add mode
    mode === 'add' && e(Box, { marginLeft: 2 },
      e(Text, null, '  Add domain: '),
      e(TextInput, {
        value: inputValue,
        onChange: setInputValue,
        onSubmit: handleAddSubmit,
      })
    ),

    // Remove mode
    mode === 'remove' && e(RemoveMode, {
      blocked,
      onRemove: handleRemove,
      onCancel: handleRemoveCancel,
    }),

    e(Text, null, '')
  );
}

const app = render(e(App));

// When Ink exits, also exit the process
app.waitUntilExit().then(() => {
  process.exit(0);
});
