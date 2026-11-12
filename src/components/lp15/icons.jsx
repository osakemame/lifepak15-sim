import React from 'react';

// Pictogrammes dessinés en SVG (aucune image externe).

export const BluetoothIcon = () => (
  <svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true">
    <circle cx="7" cy="26" r="4.5" fill="#1a1d22" />
    <path
      d="M16 18 L32 34 L24 42 V10 L32 18 L16 34"
      fill="none"
      stroke="#1763d6"
      strokeWidth="4.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

// Batterie verticale à 5 barres (toutes pleines : la simulation n'a pas de gestion de batterie)
export const BatteryIcon = () => (
  <svg viewBox="0 0 30 52" width="30" height="52" aria-hidden="true">
    <rect x="10" y="1" width="10" height="5" rx="1" fill="#222" />
    <rect x="3" y="6" width="24" height="44" rx="3" fill="#e9eef1" stroke="#222" strokeWidth="2.5" />
    {[0, 1, 2, 3, 4].map((i) => (
      <rect key={i} x="6" y={9 + i * 8} width="18" height="6" fill="#4cc23a" />
    ))}
  </svg>
);

export const EnergyIcon = () => (
  <svg viewBox="0 0 30 24" width="30" height="24" aria-hidden="true">
    <path d="M18 1 L6 14 H13 L10 23 L24 9 H16 Z" fill="#8a949c" stroke="#5c666e" strokeWidth="1" />
  </svg>
);

// Petite croix rouge : alarmes désactivées (visible à côté de chaque constante)
export const AlarmOffIcon = ({ size = 26 }) => (
  <svg viewBox="0 0 26 26" width={size} height={size} aria-hidden="true">
    <path d="M6 5 L20 21 M20 5 L6 21" stroke="#ff4a2e" strokeWidth="4.2" strokeLinecap="round" />
    <circle cx="13" cy="9" r="3" fill="#ff9a3c" />
  </svg>
);

export const BoltIcon = ({ color = '#fff', size = 40 }) => (
  <svg viewBox="0 0 40 48" width={size} height={size * 1.2} aria-hidden="true">
    <path d="M24 2 L8 26 H19 L13 46 L34 18 H22 Z" fill={color} />
  </svg>
);

export const HomeIcon = () => (
  <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
    <path d="M6 20 L20 7 L34 20 M10 18 V33 H17 V24 H23 V33 H30 V18" fill="none" stroke="#e6edf2" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

export const SunIcon = () => (
  <svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true">
    <circle cx="20" cy="20" r="6" fill="none" stroke="#e6edf2" strokeWidth="3" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line key={a} x1="20" y1="5" x2="20" y2="10" stroke="#e6edf2" strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 20 20)`} />
    ))}
  </svg>
);

export const PlugIcon = () => (
  <svg viewBox="0 0 34 34" width="30" height="30" aria-hidden="true">
    <path d="M12 4 V12 M22 4 V12 M8 12 H26 V18 C26 23 22 26 17 26 C12 26 8 23 8 18 Z M17 26 V32" fill="none" stroke="#d9dee2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BatteryChargeIcon = () => (
  <svg viewBox="0 0 34 34" width="30" height="30" aria-hidden="true">
    <rect x="6" y="9" width="22" height="16" rx="2" fill="none" stroke="#d9dee2" strokeWidth="3" transform="rotate(-35 17 17)" />
    <path d="M17 11 L13 18 H19 L15 24" fill="none" stroke="#d9dee2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WrenchIcon = () => (
  <svg viewBox="0 0 34 34" width="30" height="30" aria-hidden="true">
    <path d="M24 5 A7 7 0 0 0 17 14 L5 26 L8 29 L20 17 A7 7 0 0 0 29 10 L24 15 L20 11 Z" fill="#d9dee2" />
  </svg>
);

// Dessin du thorax affiché avec « Connectez les électrodes » (dessin simple, original)
export const TorsoDrawing = () => (
  <svg viewBox="0 0 300 130" width="100%" height="100%" aria-hidden="true">
    <g fill="none" stroke="#2a2a2a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M118 6 C120 30 108 40 76 48 C46 56 34 74 30 128" />
      <path d="M182 6 C180 30 192 40 224 48 C254 56 266 74 270 128" />
      <path d="M126 6 C130 24 138 30 150 30 C162 30 170 24 174 6" />
      <path d="M96 78 C112 90 132 90 140 78" />
      <path d="M160 78 C168 90 188 90 204 78" />
      <path d="M150 34 V120" strokeDasharray="3 6" />
    </g>
    <circle cx="124" cy="82" r="3" fill="#2a2a2a" />
    <circle cx="176" cy="82" r="3" fill="#2a2a2a" />
  </svg>
);
