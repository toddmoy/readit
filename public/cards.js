const BookCards = (() => {

  const palettes = [
    { bg: '#C1403D', fg: '#F2E8DC', accent: '#2D2D2D' },
    { bg: '#1F5F8B', fg: '#E8D5B7', accent: '#C1403D' },
    { bg: '#1B7A42', fg: '#F5F0E1', accent: '#2D2D2D' },
    { bg: '#6B3FA0', fg: '#F5DC4A', accent: '#F2E8DC' },
    { bg: '#D4862F', fg: '#1E1E30', accent: '#F2E8DC' },
    { bg: '#A8436A', fg: '#F2E8DC', accent: '#3EA28F' },
    { bg: '#2A7566', fg: '#F0E6D3', accent: '#C1403D' },
    { bg: '#3D3D8C', fg: '#F2E8DC', accent: '#D4862F' },
  ];

  const patterns = [
    (p) => `radial-gradient(circle at 78% 72%, ${p.accent} 30%, transparent 30%), ${p.bg}`,
    (p) => `repeating-linear-gradient(90deg, ${p.bg} 0 18px, ${p.fg}30 18px 36px)`,
    (p) => `linear-gradient(to bottom, ${p.bg} 50%, ${p.accent} 50%)`,
    (p) => `radial-gradient(circle at 50% 55%, ${p.fg} 30%, transparent 30%), ${p.bg}`,
    (p) => `linear-gradient(145deg, ${p.bg} 50%, ${p.accent} 50%)`,
    (p) => `linear-gradient(to bottom, ${p.accent} 28%, ${p.bg} 28% 64%, ${p.fg}40 64%)`,
    (p) => `linear-gradient(to bottom right, ${p.accent} 50%, ${p.bg} 50%)`,
    (p) => `radial-gradient(circle at 28% 62%, ${p.fg}50 22%, transparent 22%), radial-gradient(circle at 72% 38%, ${p.accent} 18%, transparent 18%), ${p.bg}`,
  ];

  function formatTitle(filename) {
    return filename.replace(/\.epub$/i, '').replace(/[-_]+/g, ' ');
  }

  function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function getCoverBg(index) {
    const p = palettes[index % palettes.length];
    const patIdx = (index * 3 + Math.floor(index / palettes.length)) % patterns.length;
    return patterns[patIdx](p);
  }

  function getPalette(index) {
    return palettes[index % palettes.length];
  }

  // ── Variant: Stack ──
  // Cover on top, title in a footer area below
  function createStack(filename, index, hasSaved) {
    const title = escapeHtml(formatTitle(filename));
    const bg = getCoverBg(index);

    const card = document.createElement('a');
    card.href = '/reader.html?book=' + encodeURIComponent(filename);
    card.className = 'group block rounded-xl overflow-hidden bg-card ring-1 ring-border transition-all hover:ring-foreground/20 hover:shadow-lg hover:shadow-black/20';

    card.innerHTML = `
      <div class="aspect-[3/4] w-full" style="background: ${bg}"></div>
      <div class="px-4 py-3">
        <p class="text-sm font-medium text-card-foreground leading-snug line-clamp-2">${title}</p>
      </div>
    `;

    return card;
  }

  // ── Variant: Overlay ──
  // Cover fills the card, title overlaid at bottom with gradient
  function createOverlay(filename, index, hasSaved) {
    const title = escapeHtml(formatTitle(filename));
    const bg = getCoverBg(index);

    const card = document.createElement('a');
    card.href = '/reader.html?book=' + encodeURIComponent(filename);
    card.className = 'group block rounded-xl overflow-hidden relative transition-all hover:shadow-lg hover:shadow-black/20 ring-1 ring-transparent hover:ring-foreground/20';

    card.innerHTML = `
      <div class="aspect-[3/4] w-full" style="background: ${bg}"></div>
      <div class="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
        <p class="text-sm font-semibold text-white leading-snug line-clamp-2">${title}</p>
      </div>
    `;

    return card;
  }

  // ── Variant: Typographic ──
  // Title as the dominant design element on a colored background
  function createTypographic(filename, index, hasSaved) {
    const title = escapeHtml(formatTitle(filename));
    const p = getPalette(index);

    const card = document.createElement('a');
    card.href = '/reader.html?book=' + encodeURIComponent(filename);
    card.className = 'group block rounded-xl overflow-hidden relative transition-all hover:shadow-lg hover:shadow-black/20 ring-1 ring-transparent hover:ring-foreground/20';

    card.innerHTML = `
      <div class="aspect-[3/4] w-full flex flex-col justify-end p-6 relative overflow-hidden" style="background: ${p.bg}">
        <div class="absolute top-0 right-0 w-3/5 h-3/5 rounded-bl-full opacity-20" style="background: ${p.accent}"></div>
        <div class="absolute bottom-[15%] left-[8%] w-[30%] aspect-square rounded-full opacity-15" style="background: ${p.fg}"></div>
        <p class="relative text-2xl font-bold leading-tight tracking-tight line-clamp-3" style="color: ${p.fg}">${title}</p>
      </div>
    `;

    return card;
  }

  const variantFns = [createStack, createOverlay, createTypographic];
  const variantNames = ['stack', 'overlay', 'typographic'];

  function create(filename, index, hasSaved) {
    return createStack(filename, index, hasSaved);
  }

  function createVariant(name, filename, index, hasSaved) {
    const map = { stack: createStack, overlay: createOverlay, typographic: createTypographic };
    return (map[name] || createStack)(filename, index, hasSaved);
  }

  return { create, createVariant, formatTitle, palettes, patterns, variantNames };

})();
