import fs from 'fs';
import path from 'path';

const assetsDir = path.resolve('public/assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Generate RisoLogy Monkey Logo SVG
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <!-- Filter for soft subtle shadow -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Blue Rounded Triangular Shield -->
  <path d="M 250 40 
           C 310 40, 420 220, 445 320 
           C 470 410, 410 450, 310 450 
           C 190 450, 130 450, 55 450 
           C -5 450, -5 390, 55 320 
           C 80 220, 190 40, 250 40 Z" 
        fill="#1452BA" />

  <!-- Monkey Mascot Body & Head (White lines/fill on blue) -->
  <g id="monkey-mascot" transform="translate(140, 120)">
    <!-- Monkey Tail -->
    <path d="M 175 140 C 220 140, 240 70, 205 50 C 190 40, 180 60, 190 75 C 205 95, 185 125, 160 128" 
          fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>

    <!-- Monkey Ears -->
    <circle cx="50" cy="70" r="22" fill="#FFFFFF"/>
    <circle cx="50" cy="70" r="13" fill="#1452BA"/>

    <circle cx="170" cy="70" r="22" fill="#FFFFFF"/>
    <circle cx="170" cy="70" r="13" fill="#1452BA"/>

    <!-- Monkey Head -->
    <ellipse cx="110" cy="75" rx="55" ry="50" fill="#FFFFFF"/>
    <!-- Head hair tuft -->
    <path d="M 105 25 C 108 12, 115 15, 118 26" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>

    <!-- Monkey Face Inner Area (Blue) -->
    <path d="M 72 70 C 72 50, 95 48, 108 62 C 121 48, 148 50, 148 70 C 148 95, 135 110, 110 110 C 85 110, 72 95, 72 70 Z" 
          fill="#1452BA"/>

    <!-- Eyes (Smiling Arcs / Dots) -->
    <ellipse cx="92" cy="70" rx="5" ry="7" fill="#FFFFFF"/>
    <ellipse cx="128" cy="70" rx="5" ry="7" fill="#FFFFFF"/>

    <!-- Big Open Smile -->
    <path d="M 88 84 C 95 106, 125 106, 132 84 Z" fill="#FFFFFF"/>
    <!-- Tongue -->
    <path d="M 102 96 C 107 104, 118 104, 122 98 Z" fill="#1452BA"/>

    <!-- Monkey Body / Arm Hugging Risol -->
    <path d="M 110 120 C 130 115, 165 140, 170 170 C 150 170, 130 170, 110 150 Z" fill="#FFFFFF"/>

    <!-- Hands hugging the risol -->
    <g fill="#FFFFFF" stroke="#1452BA" stroke-width="3">
      <!-- Left Hand fingers -->
      <path d="M 30 150 C 35 140, 52 145, 50 160 C 48 175, 30 170, 30 150 Z"/>
      <path d="M 38 152 C 45 145, 58 150, 55 168"/>
      <!-- Right Hand fingers -->
      <path d="M 75 145 C 80 135, 96 140, 94 158 C 90 172, 75 165, 75 145 Z"/>
      <path d="M 85 148 C 92 140, 104 148, 100 165"/>
    </g>

    <!-- Japanese Katakana: リソール -->
    <text x="-15" y="175" fill="#FFFFFF" font-family="'Arial', 'sans-serif'" font-weight="900" font-size="20" transform="rotate(-35, -15, 175)">
      リソール
    </text>

    <!-- Delicious Risol Mayo Cylinder (Hatched Breadcrumb Crust) -->
    <g transform="translate(10, 115) rotate(-35)">
      <!-- Rolled Risol Body -->
      <rect x="0" y="0" width="160" height="70" rx="35" fill="#1452BA" stroke="#FFFFFF" stroke-width="8"/>
      <!-- Risol Swirl end cut -->
      <ellipse cx="140" cy="35" rx="14" ry="24" fill="#FFFFFF"/>
      <path d="M 137 25 C 145 25, 146 45, 137 45 C 132 45, 133 30, 139 30" 
            fill="none" stroke="#1452BA" stroke-width="4" stroke-linecap="round"/>

      <!-- Breadcrumbs texture flakes -->
      <g stroke="#FFFFFF" stroke-width="3" stroke-linecap="round">
        <line x1="30" y1="20" x2="35" y2="22"/>
        <line x1="50" y1="35" x2="55" y2="38"/>
        <line x1="75" y1="18" x2="80" y2="20"/>
        <line x1="95" y1="42" x2="100" y2="40"/>
        <line x1="40" y1="52" x2="45" y2="50"/>
        <line x1="70" y1="55" x2="75" y2="57"/>
        <line x1="110" y1="22" x2="115" y2="25"/>
      </g>
    </g>
  </g>

  <!-- Bold Typography: RisoLogy -->
  <text x="250" y="420" text-anchor="middle" fill="#FFFFFF" 
        font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" font-size="52" letter-spacing="3">
    RisoLogy
  </text>
</svg>`;

// 2. Generate Official QRIS Sheet SVG
const qrisSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 850" width="600" height="850">
  <!-- White Paper Background -->
  <rect width="600" height="850" fill="#FFFFFF" rx="12"/>

  <!-- Left Red Geometric Triangular Accents -->
  <path d="M 0 170 L 120 270 L 0 370 Z" fill="#EE2737"/>
  <path d="M 0 270 L 60 320 L 0 370 Z" fill="#B31A28"/>

  <!-- Subtle Traditional Batik Pattern Overlay in Background -->
  <g opacity="0.04" stroke="#000000" stroke-width="2" fill="none">
    <pattern id="batik" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect x="5" y="5" width="30" height="30" rx="4"/>
      <circle cx="20" cy="20" r="8"/>
    </pattern>
    <rect width="600" height="850" fill="url(#batik)"/>
  </g>

  <!-- Top Left: QRIS Logo -->
  <g transform="translate(35, 30)">
    <!-- QRIS stylized text -->
    <rect x="0" y="4" width="28" height="28" fill="#1C1C1C" rx="3"/>
    <rect x="5" y="9" width="18" height="18" fill="#FFFFFF" rx="2"/>
    <rect x="9" y="13" width="10" height="10" fill="#1C1C1C"/>
    
    <text x="36" y="27" font-family="'Arial Black', sans-serif" font-weight="900" font-size="28" fill="#1C1C1C" letter-spacing="-1">
      QRIS
    </text>
    <text x="110" y="16" font-family="'Arial', sans-serif" font-weight="700" font-size="10" fill="#1C1C1C">
      QR Code Standar
    </text>
    <text x="110" y="27" font-family="'Arial', sans-serif" font-weight="700" font-size="10" fill="#1C1C1C">
      Pembayaran Nasional
    </text>
  </g>

  <!-- Top Right: GPN Red Eagle Logo -->
  <g transform="translate(500, 25)">
    <!-- Eagle Wings in Red -->
    <path d="M 15 25 C 20 10, 45 0, 55 12 C 45 15, 35 22, 30 35 C 38 30, 48 26, 55 28 C 45 35, 38 42, 30 50 Z" fill="#EE2737"/>
    <text x="8" y="52" font-family="'Arial Black', sans-serif" font-weight="900" font-size="16" fill="#1C1C1C" letter-spacing="1">
      GPN
    </text>
  </g>

  <!-- Header Store Information -->
  <text x="300" y="155" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="900" font-size="28" fill="#111827">
    RisoLogy, Elektronik
  </text>
  <text x="300" y="195" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="700" font-size="19" fill="#1F2937">
    NMID : ID1026489793988
  </text>
  <text x="300" y="235" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="700" font-size="20" fill="#1F2937">
    A01
  </text>

  <!-- QR Code Frame & High Density QR Matrix Representation -->
  <g transform="translate(140, 270)">
    <!-- QR Outer Border -->
    <rect x="-10" y="-10" width="340" height="340" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2" rx="8"/>

    <!-- 3 Finder Patterns (Top-Left, Top-Right, Bottom-Left) -->
    <!-- Top-Left -->
    <rect x="10" y="10" width="64" height="64" fill="#000000"/>
    <rect x="20" y="20" width="44" height="44" fill="#FFFFFF"/>
    <rect x="28" y="28" width="28" height="28" fill="#000000"/>

    <!-- Top-Right -->
    <rect x="246" y="10" width="64" height="64" fill="#000000"/>
    <rect x="256" y="20" width="44" height="44" fill="#FFFFFF"/>
    <rect x="264" y="28" width="28" height="28" fill="#000000"/>

    <!-- Bottom-Left -->
    <rect x="10" y="246" width="64" height="64" fill="#000000"/>
    <rect x="20" y="256" width="44" height="44" fill="#FFFFFF"/>
    <rect x="28" y="264" width="28" height="28" fill="#000000"/>

    <!-- Timing Patterns -->
    <g fill="#000000">
      <rect x="85" y="38" width="150" height="8" rx="2"/>
      <rect x="38" y="85" width="8" height="150" rx="2"/>

      <!-- Dense QR Code modules simulation with realistic clustering -->
      <!-- Center pattern -->
      <rect x="100" y="100" width="120" height="120" fill="#000000" rx="4"/>
      <rect x="115" y="115" width="90" height="90" fill="#FFFFFF" rx="2"/>
      <rect x="135" y="135" width="50" height="50" fill="#000000"/>
      <circle cx="160" cy="160" r="12" fill="#FFFFFF"/>

      <!-- Surrounding Data Blocks -->
      <rect x="90" y="15" width="25" height="15"/>
      <rect x="125" y="15" width="15" height="15"/>
      <rect x="150" y="10" width="20" height="20"/>
      <rect x="180" y="20" width="30" height="12"/>
      <rect x="220" y="15" width="15" height="15"/>

      <rect x="90" y="55" width="40" height="15"/>
      <rect x="140" y="55" width="20" height="30"/>
      <rect x="175" y="60" width="35" height="15"/>
      <rect x="220" y="55" width="15" height="30"/>

      <rect x="15" y="90" width="15" height="35"/>
      <rect x="15" y="135" width="15" height="20"/>
      <rect x="15" y="165" width="15" height="30"/>
      <rect x="15" y="205" width="15" height="25"/>

      <rect x="55" y="90" width="20" height="20"/>
      <rect x="55" y="125" width="25" height="30"/>
      <rect x="55" y="170" width="20" height="20"/>
      <rect x="55" y="205" width="20" height="30"/>

      <rect x="250" y="90" width="20" height="35"/>
      <rect x="285" y="90" width="25" height="20"/>
      <rect x="250" y="140" width="20" height="25"/>
      <rect x="280" y="125" width="30" height="18"/>
      <rect x="250" y="180" width="60" height="20"/>
      <rect x="250" y="215" width="25" height="25"/>
      <rect x="285" y="215" width="25" height="20"/>

      <rect x="90" y="240" width="35" height="20"/>
      <rect x="140" y="240" width="20" height="30"/>
      <rect x="170" y="245" width="30" height="15"/>
      <rect x="210" y="240" width="20" height="20"/>

      <rect x="90" y="275" width="20" height="35"/>
      <rect x="120" y="280" width="35" height="20"/>
      <rect x="165" y="275" width="20" height="35"/>
      <rect x="195" y="280" width="40" height="25"/>
      <rect x="245" y="255" width="65" height="20"/>
      <rect x="245" y="285" width="30" height="25"/>
      <rect x="285" y="285" width="25" height="25"/>
    </g>
  </g>

  <!-- Tagline: SATU QRIS UNTUK SEMUA -->
  <text x="300" y="640" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="900" font-size="20" fill="#1E293B" letter-spacing="1">
    SATU QRIS UNTUK SEMUA
  </text>
  <text x="300" y="670" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="600" font-size="14" fill="#475569">
    Cek aplikasi penyelenggara di:
  </text>
  <text x="300" y="692" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="700" font-size="14" fill="#0F172A">
    www.aspi-qris.id
  </text>

  <!-- Bottom Red Wave Banner & Payment Instruction Icons -->
  <g transform="translate(0, 715)">
    <!-- Red curved banner on right side -->
    <path d="M 280 135 C 330 90, 420 50, 600 45 L 600 135 Z" fill="#EE2737"/>

    <!-- Instructions Text on top of red banner -->
    <text x="560" y="32" text-anchor="end" font-family="'Arial', sans-serif" font-weight="800" font-size="12" fill="#1E293B">
      Cara bayar dengan QRIS:
    </text>

    <!-- 3 Action Icons -->
    <!-- Icon 1: Phone with QRIS -->
    <g transform="translate(425, 45)">
      <circle cx="20" cy="20" r="18" fill="#FFFFFF" stroke="#EE2737" stroke-width="2"/>
      <rect x="13" y="10" width="14" height="20" rx="2" fill="none" stroke="#111827" stroke-width="2"/>
      <rect x="16" y="14" width="8" height="8" fill="#EE2737"/>
    </g>
    <text x="445" y="95" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="700" font-size="9" fill="#FFFFFF">
      Buka Aplikasi
    </text>
    <text x="445" y="106" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="700" font-size="9" fill="#FFFFFF">
      Berlogo QRIS
    </text>

    <!-- Icon 2: Scan and Check -->
    <g transform="translate(485, 45)">
      <circle cx="20" cy="20" r="18" fill="#FFFFFF" stroke="#EE2737" stroke-width="2"/>
      <rect x="13" y="10" width="14" height="20" rx="2" fill="none" stroke="#111827" stroke-width="2"/>
      <line x1="10" y1="20" x2="30" y2="20" stroke="#EE2737" stroke-width="2"/>
    </g>
    <text x="505" y="95" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="700" font-size="9" fill="#FFFFFF">
      Scan dan Cek
    </text>

    <!-- Icon 3: Pay -->
    <g transform="translate(545, 45)">
      <circle cx="20" cy="20" r="18" fill="#FFFFFF" stroke="#EE2737" stroke-width="2"/>
      <rect x="13" y="10" width="14" height="20" rx="2" fill="none" stroke="#111827" stroke-width="2"/>
      <path d="M 16 20 L 19 23 L 24 17" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <text x="565" y="95" text-anchor="middle" font-family="'Arial', sans-serif" font-weight="700" font-size="9" fill="#FFFFFF">
      Bayar
    </text>

    <!-- Bottom Left Print Details -->
    <text x="35" y="85" font-family="'Arial', sans-serif" font-weight="600" font-size="12" fill="#334155">
      Dicetak oleh: 93600915
    </text>
    <text x="35" y="105" font-family="'Arial', sans-serif" font-weight="600" font-size="12" fill="#334155">
      Versi cetak: 1.0.15.10.26
    </text>
  </g>
</svg>`;

// Write SVGs
fs.writeFileSync(path.resolve(assetsDir, 'logo.svg'), logoSvg);
fs.writeFileSync(path.resolve(assetsDir, 'qris.svg'), qrisSvg);

// Also copy or write as png fallback paths so both /assets/logo.png and /assets/logo.svg resolve cleanly
fs.writeFileSync(path.resolve(assetsDir, 'logo.png'), logoSvg);
fs.writeFileSync(path.resolve(assetsDir, 'qris.png'), qrisSvg);

console.log('Successfully generated RisoLogy Logo & QRIS assets in public/assets/');
