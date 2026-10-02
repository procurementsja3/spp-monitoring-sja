/**
 * Logo Default Bawaan Sistem PT SJA Procurement & SLA Management
 * Otomatis tampil untuk seluruh pengguna di halaman login dan sidebar tanpa perlu upload manual.
 */

// SVG Corporate Logo SJA (Hexagonal Shield Crest + Monogram)
export const SJA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="sja_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="50%" stop-color="#1d4ed8" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="gold_accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Outer Rounded Polygon Shield -->
  <rect x="15" y="15" width="170" height="170" rx="36" fill="url(#sja_grad)" filter="url(#shadow)" stroke="#3b82f6" stroke-width="2" />
  
  <!-- Subtle Inner Ring Accent -->
  <rect x="25" y="25" width="150" height="150" rx="28" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" />
  
  <!-- Modern Geometric Procurement Symbol Behind -->
  <path d="M 100 42 L 152 72 L 152 128 L 100 158 L 48 128 L 48 72 Z" fill="none" stroke="url(#gold_accent)" stroke-width="2.5" stroke-dasharray="6,4" opacity="0.45" />

  <!-- Monogram SJA -->
  <text x="100" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="54" fill="#ffffff" text-anchor="middle" letter-spacing="-1">SJA</text>
  
  <!-- Bottom Ribbon / Category Tag -->
  <rect x="52" y="128" width="96" height="20" rx="10" fill="url(#gold_accent)" />
  <text x="100" y="142" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="9" fill="#0f172a" text-anchor="middle" letter-spacing="1.5">PROCUREMENT</text>
</svg>`;

export const DEFAULT_SYSTEM_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(SJA_LOGO_SVG)}`;
