// Shared helpers
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

export async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // crypto.subtle needs a secure context; fall back to a small non-cryptographic hash
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    const part = n => (n >>> 0).toString(16).padStart(8, '0');
    return (part(h1) + part(h2)).repeat(4);
  }
}

export const shortHash = h => `0x${h.slice(0, 6)}…${h.slice(-4)}`;

// Memoized: hero3d and map both read vienna.json and venues.json
const cache = new Map();
export function json(rel) {
  const url = new URL(rel, import.meta.url).href;
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(res => {
      if (!res.ok) throw new Error(`${rel}: ${res.status}`);
      return res.json();
    }));
  }
  return cache.get(url);
}

// Run fn only while el is on screen; returns a stop function
export function whileVisible(el, onShow, onHide, margin = '100px') {
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? onShow() : onHide()), { rootMargin: margin });
  io.observe(el);
  return () => io.disconnect();
}

export function css(name, el = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}
