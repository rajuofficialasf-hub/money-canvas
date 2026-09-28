import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outputDir = path.resolve('public/play-store');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. App Icon (512 x 512 px) - Full Bleed, 32-bit PNG compliant with Google Play
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811" />
      <stop offset="40%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#022119" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Full Bleed Background (Required by Google Play) -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Background Ambient Glow & Grid Accents -->
  <circle cx="256" cy="180" r="160" fill="#10b981" opacity="0.08" filter="url(#softGlow)" />
  <circle cx="360" cy="360" r="120" fill="#f59e0b" opacity="0.06" filter="url(#softGlow)" />
  
  <!-- Subtle Architectural Grid Inside Safe Zone -->
  <g stroke="#334155" stroke-opacity="0.25" stroke-width="1">
    <line x1="96" y1="128" x2="416" y2="128" />
    <line x1="96" y1="256" x2="416" y2="256" />
    <line x1="96" y1="384" x2="416" y2="384" />
    <line x1="128" y1="96" x2="128" y2="416" />
    <line x1="256" y1="96" x2="256" y2="416" />
    <line x1="384" y1="96" x2="384" y2="416" />
  </g>

  <!-- Outer Safe-Zone Protective Ring -->
  <rect x="76" y="76" width="360" height="360" rx="72" fill="none" stroke="#10b981" stroke-width="3" stroke-opacity="0.2" stroke-dasharray="8 8" />

  <!-- Central Emblem: 3D Layered Wealth Canvas & Growth Node -->
  <g transform="translate(0, -6)">
    <!-- Back Diamond / Canvas Layer -->
    <path d="M256 100 L380 180 L380 320 L256 400 L132 320 L132 180 Z" 
          fill="url(#cardGrad)" 
          stroke="#10b981" 
          stroke-width="2.5" 
          stroke-opacity="0.4" />

    <!-- Upward Dynamic Growth Curves (Canvas Wings) -->
    <path d="M152 290 C180 200, 220 160, 256 160 C292 160, 332 200, 360 290" 
          fill="none" 
          stroke="#1e3a5f" 
          stroke-width="12" 
          stroke-linecap="round" />
    
    <path d="M165 275 C190 205, 225 170, 256 170 C287 170, 322 205, 347 275" 
          fill="none" 
          stroke="url(#emeraldGrad)" 
          stroke-width="8" 
          stroke-linecap="round" 
          filter="url(#softGlow)" />

    <!-- Double-Entry Balance Crossbar -->
    <line x1="180" y1="230" x2="332" y2="230" stroke="#047857" stroke-width="6" stroke-linecap="round" />
    <line x1="185" y1="230" x2="327" y2="230" stroke="#34d399" stroke-width="3" stroke-linecap="round" />

    <!-- Core Golden Wealth Node -->
    <circle cx="256" cy="245" r="46" fill="#0f172a" stroke="url(#goldGrad)" stroke-width="4" filter="url(#goldGlow)" />
    <circle cx="256" cy="245" r="38" fill="url(#goldGrad)" opacity="0.15" />
    
    <!-- Stylized Financial Monogram / Node Symbol -->
    <text x="256" y="260" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="42" fill="url(#goldGrad)" filter="url(#goldGlow)">৳</text>

    <!-- Upward Momentum Arrow / Apex -->
    <path d="M256 122 L274 154 L238 154 Z" fill="url(#emeraldGrad)" filter="url(#softGlow)" />

    <!-- Left & Right Balancer Nodes -->
    <circle cx="180" cy="230" r="10" fill="#10b981" />
    <circle cx="332" cy="230" r="10" fill="#f59e0b" />
  </g>

  <!-- Typography Brand Mark in Base Safe Zone -->
  <text x="256" y="445" text-anchor="middle" font-family="'Segoe UI', Roboto, -apple-system, sans-serif" font-weight="800" font-size="24" fill="#ffffff" letter-spacing="3.5">MONEY CANVAS</text>
  <text x="256" y="470" text-anchor="middle" font-family="monospace" font-weight="600" font-size="12" fill="#10b981" letter-spacing="2.5">FINANCE &amp; LEDGER OS</text>
</svg>
`;

// 2. Feature Graphic (1024 x 500 px) - 100% English
const featureSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
  <defs>
    <linearGradient id="fBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#040711" />
      <stop offset="35%" stop-color="#0a1226" />
      <stop offset="70%" stop-color="#0b1b2f" />
      <stop offset="100%" stop-color="#022119" />
    </linearGradient>
    <linearGradient id="fEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="fGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="cardGlass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="accentLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <filter id="fGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Solid Background (No Transparency - Google Play Requirement) -->
  <rect width="1024" height="500" fill="url(#fBgGrad)" />

  <!-- Ambient Light Orbs -->
  <circle cx="200" cy="100" r="220" fill="#10b981" opacity="0.08" filter="url(#fGlow)" />
  <circle cx="850" cy="400" r="260" fill="#0284c7" opacity="0.09" filter="url(#fGlow)" />
  <circle cx="700" cy="120" r="180" fill="#f59e0b" opacity="0.07" filter="url(#fGlow)" />

  <!-- Decorative Tech Grid (Subtle) -->
  <g stroke="#1e293b" stroke-opacity="0.4" stroke-width="1">
    <line x1="0" y1="100" x2="1024" y2="100" />
    <line x1="0" y1="250" x2="1024" y2="250" />
    <line x1="0" y1="400" x2="1024" y2="400" />
    <line x1="160" y1="0" x2="160" y2="500" />
    <line x1="380" y1="0" x2="380" y2="500" />
    <line x1="620" y1="0" x2="620" y2="500" />
    <line x1="860" y1="0" x2="860" y2="500" />
  </g>

  <!-- Top Accent Color Bar -->
  <rect x="0" y="0" width="1024" height="4" fill="url(#accentLineGrad)" />

  <!-- ================= LEFT COLUMN: APP COPY & BRANDING ================= -->
  <g transform="translate(64, 55)">
    <!-- App Badge Pill -->
    <rect x="0" y="0" width="220" height="32" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.6" />
    <circle cx="16" cy="16" r="6" fill="#10b981" />
    <text x="32" y="21" font-family="'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="12" fill="#34d399" letter-spacing="1.5">MONEY CANVAS OS</text>
    <rect x="170" y="6" width="38" height="20" rx="4" fill="#10b981" fill-opacity="0.2" />
    <text x="189" y="20" text-anchor="middle" font-family="monospace" font-weight="800" font-size="10" fill="#34d399">PRO</text>

    <!-- Main Title in Pure English -->
    <text x="0" y="90" font-family="'Segoe UI', Roboto, -apple-system, sans-serif" font-weight="900" font-size="38" fill="#ffffff" letter-spacing="-0.5">
      Smart Wealth &amp; Financial OS
    </text>
    <text x="0" y="130" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="21" fill="#94a3b8">
      Double-Entry Wealth &amp; Investment Manager
    </text>

    <!-- Feature Highlights in English -->
    <g transform="translate(0, 168)" font-family="'Segoe UI', Roboto, sans-serif" font-size="14.5" fill="#cbd5e1">
      <!-- Bullet 1 -->
      <g transform="translate(0, 0)">
        <circle cx="10" cy="10" r="10" fill="#10b981" fill-opacity="0.2" />
        <path d="M6 10 L9 13 L14 7" stroke="#34d399" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <text x="30" y="15" font-weight="600">100% Offline &amp; Private (No Ads, Zero Tracking)</text>
      </g>
      <!-- Bullet 2 -->
      <g transform="translate(0, 36)">
        <circle cx="10" cy="10" r="10" fill="#38bdf8" fill-opacity="0.2" />
        <path d="M6 10 L9 13 L14 7" stroke="#38bdf8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <text x="30" y="15" font-weight="600">Automated bKash, Nagad &amp; Bank SMS Parsing</text>
      </g>
      <!-- Bullet 3 -->
      <g transform="translate(0, 72)">
        <circle cx="10" cy="10" r="10" fill="#f59e0b" fill-opacity="0.2" />
        <path d="M6 10 L9 13 L14 7" stroke="#fbbf24" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <text x="30" y="15" font-weight="600">DSE Stocks, Sanchayapatra Bonds, DPS &amp; Zakat</text>
      </g>
    </g>

    <!-- Trust Badges Bar -->
    <g transform="translate(0, 305)">
      <rect x="0" y="0" width="130" height="34" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <text x="65" y="21" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="#38bdf8">৳ BDT &amp; $ USD</text>

      <rect x="142" y="0" width="135" height="34" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <text x="209" y="21" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="#34d399">OFFLINE-FIRST</text>

      <rect x="289" y="0" width="145" height="34" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <text x="361" y="21" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="#fbbf24">SHARIAH ZAKAT</text>
    </g>
  </g>

  <!-- ================= RIGHT COLUMN: 3D FINTECH CARDS MOCKUP ================= -->
  <g transform="translate(560, 60)">
    <!-- Main Net Worth Card (Glassmorphic) -->
    <rect x="0" y="0" width="410" height="230" rx="20" fill="url(#cardGlass)" stroke="#334155" stroke-width="1.5" />
    <rect x="0" y="0" width="410" height="230" rx="20" fill="none" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.3" />

    <!-- Card Header -->
    <g transform="translate(24, 24)">
      <text x="0" y="14" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="12" fill="#94a3b8" letter-spacing="1">TOTAL NET WORTH</text>
      <text x="0" y="52" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="34" fill="#ffffff">৳ 1,584,250</text>
      
      <!-- Growth Badge -->
      <rect x="260" y="24" width="110" height="26" rx="13" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.4" />
      <text x="315" y="41" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#34d399">+12.8% ↗ MoM</text>

      <!-- Mini Sparkline Curve -->
      <path d="M0 110 C40 100, 70 120, 110 85 C150 50, 180 80, 220 50 C260 20, 300 45, 360 15" 
            fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
      <circle cx="360" cy="15" r="4" fill="#34d399" filter="url(#fGlow)" />

      <!-- Accounts Balance Breakdown Row -->
      <g transform="translate(0, 140)">
        <rect x="0" y="0" width="112" height="38" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
        <text x="12" y="15" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8">Bank Accounts</text>
        <text x="12" y="30" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="#38bdf8">৳ 650,000</text>

        <rect x="124" y="0" width="112" height="38" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
        <text x="136" y="15" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8">DSE Portfolio</text>
        <text x="136" y="30" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="#34d399">৳ 720,000</text>

        <rect x="248" y="0" width="112" height="38" rx="8" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
        <text x="260" y="15" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8">bKash &amp; Wallets</text>
        <text x="260" y="30" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="#fbbf24">৳ 214,250</text>
      </g>
    </g>

    <!-- Floating Sub-Card 1: Real-time SMS Parsing & Double-Entry -->
    <g transform="translate(-40, 245)">
      <rect x="0" y="0" width="220" height="96" rx="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.6" filter="url(#fGlow)" />
      <g transform="translate(16, 16)">
        <circle cx="10" cy="10" r="10" fill="#0284c7" />
        <text x="10" y="14" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="11" fill="#ffffff">SMS</text>
        <text x="28" y="14" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="11" fill="#38bdf8">bKash Auto-Entry</text>
        <text x="0" y="36" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="13" fill="#ffffff">+৳ 15,000 Received</text>
        <text x="0" y="54" font-family="monospace" font-size="10" fill="#94a3b8">Debit: bKash | Credit: Salary</text>
        <rect x="0" y="62" width="65" height="14" rx="3" fill="#10b981" fill-opacity="0.2" />
        <text x="32" y="72" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="9" fill="#34d399">VERIFIED ✓</text>
      </g>
    </g>

    <!-- Floating Sub-Card 2: DSE Stock & DPS Tracker -->
    <g transform="translate(200, 245)">
      <rect x="0" y="0" width="220" height="96" rx="14" fill="#0f172a" stroke="#10b981" stroke-width="1.2" stroke-opacity="0.6" filter="url(#fGlow)" />
      <g transform="translate(16, 16)">
        <circle cx="10" cy="10" r="10" fill="#059669" />
        <text x="10" y="14" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="11" fill="#ffffff">DSE</text>
        <text x="28" y="14" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="11" fill="#34d399">GP &amp; SQURPHARMA</text>
        <text x="0" y="36" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="13" fill="#34d399">P&amp;L: +৳ 42,500 (+9%)</text>
        <text x="0" y="54" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8">DPS Maturity: 12% Compounded</text>
        <rect x="0" y="62" width="70" height="14" rx="3" fill="#f59e0b" fill-opacity="0.2" />
        <text x="35" y="72" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="9" fill="#fbbf24">PORTFOLIO</text>
      </g>
    </g>
  </g>
</svg>
`;

// Helper: Common Device Frame for 1080x1920 Screenshots
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderScreenshotSvg({ title, subtitle, badgeText, badgeColor = '#10b981', children }) {
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const safeBadgeText = escapeXml((badgeText || '').toUpperCase());

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <linearGradient id="scBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811" />
      <stop offset="40%" stop-color="#0b1328" />
      <stop offset="100%" stop-color="#021f17" />
    </linearGradient>
    <linearGradient id="phoneBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>
    <filter id="phoneShadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="25" stdDeviation="35" flood-color="#000000" flood-opacity="0.8" />
    </filter>
    <filter id="scGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Wallpaper -->
  <rect width="1080" height="1920" fill="url(#scBgGrad)" />

  <!-- Background Lighting Radiance -->
  <circle cx="540" cy="300" r="400" fill="${badgeColor}" opacity="0.09" filter="url(#scGlow)" />
  <circle cx="850" cy="1400" r="350" fill="#0284c7" opacity="0.06" filter="url(#scGlow)" />

  <!-- TOP PROMOTIONAL HEADER (Google Play Style - 100% English) -->
  <g transform="translate(540, 110)" text-anchor="middle">
    <!-- Category Badge -->
    <rect x="-140" y="0" width="280" height="42" rx="21" fill="#0f172a" stroke="${badgeColor}" stroke-width="1.8" />
    <text x="0" y="27" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="15" fill="${badgeColor}" letter-spacing="2">${safeBadgeText}</text>

    <!-- Main Headline English -->
    <text x="0" y="105" font-family="'Segoe UI', Roboto, -apple-system, sans-serif" font-weight="900" font-size="42" fill="#ffffff" letter-spacing="-0.5">
      ${safeTitle}
    </text>

    <!-- Subtitle English -->
    <text x="0" y="150" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="23" fill="#94a3b8">
      ${safeSubtitle}
    </text>
  </g>

  <!-- SMARTPHONE DEVICE MOCKUP (Centered, 1080 Width Layout) -->
  <g transform="translate(130, 310)" filter="url(#phoneShadow)">
    <!-- Outer Phone Chassis -->
    <rect x="0" y="0" width="820" height="1540" rx="64" fill="#0f172a" stroke="url(#phoneBorder)" stroke-width="12" />
    <rect x="6" y="6" width="808" height="1528" rx="58" fill="none" stroke="#020617" stroke-width="6" />

    <!-- Screen Bezel Clip -->
    <g transform="translate(16, 16)">
      <clipPath id="screenClip">
        <rect width="788" height="1508" rx="48" />
      </clipPath>

      <g clip-path="url(#screenClip)">
        <!-- Phone Screen Background -->
        <rect width="788" height="1508" fill="#090d16" />

        <!-- Status Bar -->
        <g transform="translate(36, 26)">
          <text x="0" y="14" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#ffffff">9:41</text>
          <!-- Dynamic Island Notch -->
          <rect x="250" y="-8" width="150" height="28" rx="14" fill="#020617" />
          <circle cx="370" cy="6" r="5" fill="#1e293b" />
          <!-- Icons -->
          <g transform="translate(680, 0)" fill="#ffffff">
            <path d="M0 12 L4 12 L4 2 L0 2 Z M6 12 L10 12 L10 4 L6 4 Z M12 12 L16 12 L16 7 L12 7 Z" />
            <rect x="22" y="2" width="22" height="11" rx="3" fill="none" stroke="#ffffff" stroke-width="1.5" />
            <rect x="24" y="4" width="14" height="7" rx="1.5" fill="#34d399" />
          </g>
        </g>

        <!-- In-Screen App Content -->
        <g transform="translate(30, 80)">
          ${children}
        </g>
      </g>
    </g>
  </g>
</svg>
`;
}

// 3. Screenshot 1: Dashboard & Net Worth - 100% English
const screenshot1Svg = renderScreenshotSvg({
  badgeText: 'DASHBOARD & WEALTH',
  badgeColor: '#10b981',
  title: 'Complete Financial Overview at a Glance',
  subtitle: 'Track Net Worth, Real-Time Cash Flow & Multi-Accounts',
  children: `
    <!-- App Header inside Phone -->
    <g transform="translate(0, 0)">
      <circle cx="24" cy="24" r="24" fill="#10b981" fill-opacity="0.2" />
      <path d="M16 24 L22 30 L32 18" stroke="#34d399" stroke-width="3" fill="none" stroke-linecap="round" />
      <text x="60" y="20" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#ffffff">Money Canvas</text>
      <text x="60" y="38" font-family="'Segoe UI', sans-serif" font-size="12" fill="#10b981">Personal Finance &amp; Ledger OS</text>

      <rect x="620" y="8" width="105" height="34" rx="17" fill="#1e293b" />
      <text x="672" y="30" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#38bdf8">BDT ৳</text>
    </g>

    <!-- Master Net Worth Hero Card -->
    <g transform="translate(0, 70)">
      <rect width="728" height="260" rx="24" fill="#0f1d32" stroke="#1e3a5f" stroke-width="2" />
      <rect width="728" height="260" rx="24" fill="none" stroke="#10b981" stroke-width="2" stroke-opacity="0.4" />
      
      <g transform="translate(32, 32)">
        <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#94a3b8" letter-spacing="1">TOTAL NET WORTH</text>
        <text x="0" y="68" font-family="'Segoe UI', sans-serif" font-size="44" font-weight="800" fill="#ffffff">৳ 1,584,250</text>
        
        <rect x="460" y="32" width="200" height="38" rx="19" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.5" />
        <text x="560" y="56" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" fill="#34d399">+12.8% ↗ This Month</text>

        <!-- Sparkline Chart -->
        <path d="M0 135 C80 120, 160 145, 260 100 C360 55, 460 90, 560 50 C610 30, 640 40, 664 25" 
              fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round" />
        <circle cx="664" cy="25" r="6" fill="#34d399" />

        <!-- Sub metrics -->
        <g transform="translate(0, 165)">
          <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">Monthly Income: <tspan fill="#34d399" font-weight="700">+৳ 120,000</tspan></text>
          <text x="320" y="16" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">Monthly Expenses: <tspan fill="#f43f5e" font-weight="700">-৳ 42,150</tspan></text>
        </g>
      </g>
    </g>

    <!-- Quick Action Transfer Buttons -->
    <g transform="translate(0, 360)">
      <rect x="0" y="0" width="168" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      <text x="84" y="36" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#ffffff">+ Expense</text>

      <rect x="186" y="0" width="168" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      <text x="270" y="36" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#34d399">+ Income</text>

      <rect x="372" y="0" width="168" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      <text x="456" y="36" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#38bdf8">↔ Transfer</text>

      <rect x="558" y="0" width="170" height="60" rx="16" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="1.5" />
      <text x="643" y="36" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#34d399">💬 SMS Parse</text>
    </g>

    <!-- Account Balances Carousel Cards -->
    <g transform="translate(0, 450)">
      <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="800" fill="#ffffff">Account Balances</text>
      
      <!-- Bank Account Card -->
      <g transform="translate(0, 35)">
        <rect width="350" height="140" rx="18" fill="#0f172a" stroke="#1e3a5f" stroke-width="1.5" />
        <g transform="translate(20, 24)">
          <text x="0" y="14" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" fill="#38bdf8">Bank Accounts (City &amp; BRAC)</text>
          <text x="0" y="46" font-family="'Segoe UI', sans-serif" font-size="26" font-weight="800" fill="#ffffff">৳ 650,000</text>
          <text x="0" y="74" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">Active · Reconciled today</text>
        </g>
      </g>

      <!-- bKash / Mobile Wallet Card -->
      <g transform="translate(378, 35)">
        <rect width="350" height="140" rx="18" fill="#0f172a" stroke="#be185d" stroke-width="1.5" stroke-opacity="0.5" />
        <g transform="translate(20, 24)">
          <text x="0" y="14" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" fill="#f43f5e">bKash &amp; Mobile Wallets</text>
          <text x="0" y="46" font-family="'Segoe UI', sans-serif" font-size="26" font-weight="800" fill="#ffffff">৳ 214,250</text>
          <text x="0" y="74" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">Instant SMS sync enabled</text>
        </g>
      </g>
    </g>

    <!-- Recent Double-Entry Ledger Transactions -->
    <g transform="translate(0, 660)">
      <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="800" fill="#ffffff">Recent Transactions (Double-Entry)</text>
      
      <!-- Txn 1 -->
      <g transform="translate(0, 35)">
        <rect width="728" height="85" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="45" cy="42" r="22" fill="#10b981" fill-opacity="0.15" />
        <text x="45" y="48" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#34d399">↓</text>
        <text x="85" y="34" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#ffffff">Monthly Salary Credit</text>
        <text x="85" y="56" font-family="monospace" font-size="12" fill="#94a3b8">Dr. City Bank | Cr. Salary Income</text>
        <text x="680" y="44" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#34d399">+৳ 120,000</text>
      </g>

      <!-- Txn 2 -->
      <g transform="translate(0, 135)">
        <rect width="728" height="85" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="45" cy="42" r="22" fill="#f43f5e" fill-opacity="0.15" />
        <text x="45" y="48" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#f43f5e">↑</text>
        <text x="85" y="34" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#ffffff">Shwapno Supermarket Grocery</text>
        <text x="85" y="56" font-family="monospace" font-size="12" fill="#94a3b8">Dr. Groceries | Cr. bKash Personal</text>
        <text x="680" y="44" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#f43f5e">-৳ 4,650</text>
      </g>

      <!-- Txn 3 -->
      <g transform="translate(0, 235)">
        <rect width="728" height="85" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="45" cy="42" r="22" fill="#38bdf8" fill-opacity="0.15" />
        <text x="45" y="48" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#38bdf8">⇄</text>
        <text x="85" y="34" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#ffffff">DPS Monthly Deposit</text>
        <text x="85" y="56" font-family="monospace" font-size="12" fill="#94a3b8">Dr. DPS 5-Yr Asset | Cr. BRAC Bank</text>
        <text x="680" y="44" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#38bdf8">৳ 10,000</text>
      </g>
    </g>

    <!-- Bottom Mobile Nav Bar -->
    <g transform="translate(0, 1020)">
      <rect width="728" height="75" rx="24" fill="#0f172a" stroke="#1e293b" stroke-width="2" />
      <g transform="translate(72, 38)" text-anchor="middle">
        <circle cx="0" cy="-5" r="16" fill="#10b981" fill-opacity="0.2" />
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="14" fill="#34d399">⊞</text>
        <text x="0" y="22" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="10" fill="#34d399">Dashboard</text>
      </g>
      <g transform="translate(216, 38)" text-anchor="middle">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="14" fill="#94a3b8">☰</text>
        <text x="0" y="22" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="10" fill="#94a3b8">Ledger</text>
      </g>
      <g transform="translate(364, 38)" text-anchor="middle">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="14" fill="#94a3b8">📈</text>
        <text x="0" y="22" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="10" fill="#94a3b8">Investments</text>
      </g>
      <g transform="translate(510, 38)" text-anchor="middle">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="14" fill="#94a3b8">🎯</text>
        <text x="0" y="22" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="10" fill="#94a3b8">Budgets</text>
      </g>
      <g transform="translate(654, 38)" text-anchor="middle">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="14" fill="#94a3b8">⚙</text>
        <text x="0" y="22" font-family="'Segoe UI', sans-serif" font-weight="600" font-size="10" fill="#94a3b8">Settings</text>
      </g>
    </g>
  `
});

// 4. Screenshot 2: SMS Parser & Double-Entry Ledger - 100% English
const screenshot2Svg = renderScreenshotSvg({
  badgeText: 'AUTOMATION & LEDGER',
  badgeColor: '#38bdf8',
  title: 'Instant SMS Auto-Parsing & Double-Entry Ledger',
  subtitle: 'Automate Transactions with Audit-Grade Accounting Standards',
  children: `
    <!-- Top Header -->
    <g transform="translate(0, 0)">
      <text x="0" y="24" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="20" fill="#ffffff">Automated SMS Parser</text>
      <text x="0" y="48" font-family="'Segoe UI', sans-serif" font-size="13" fill="#38bdf8">bKash, Nagad, City, BRAC &amp; EBL Bank SMS Support</text>
    </g>

    <!-- Interactive SMS Parser Showcase Card -->
    <g transform="translate(0, 70)">
      <rect width="728" height="300" rx="22" fill="#0c172a" stroke="#38bdf8" stroke-width="2" />
      
      <!-- Simulated Incoming SMS Bubble -->
      <g transform="translate(24, 24)">
        <rect width="680" height="95" rx="14" fill="#1e293b" />
        <circle cx="28" cy="28" r="16" fill="#be185d" />
        <text x="28" y="33" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="11" fill="#ffffff">bK</text>
        <text x="56" y="26" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="13" fill="#f43f5e">bKash Notification · Just Now</text>
        <text x="56" y="48" font-family="monospace" font-size="12" fill="#e2e8f0">You have received Tk 15,000.00 from 01711XXXXXX. Fee Tk 0.00. TrxID 9K8L2M3P</text>
      </g>

      <!-- Auto Parsed Result -->
      <g transform="translate(24, 140)">
        <rect width="680" height="135" rx="14" fill="#06201b" stroke="#10b981" stroke-width="1.5" />
        <g transform="translate(20, 24)">
          <circle cx="16" cy="16" r="14" fill="#10b981" />
          <path d="M10 16 L14 20 L22 12" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" />
          <text x="42" y="21" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#34d399">Automatically Recognized Double-Entry Journal</text>

          <g transform="translate(0, 42)" font-family="monospace" font-size="13">
            <rect width="310" height="36" rx="6" fill="#0f172a" />
            <text x="12" y="23" fill="#38bdf8">DEBIT: [Assets] bKash Wallet</text>
            <text x="220" y="23" font-weight="700" fill="#34d399">৳ 15,000</text>

            <rect x="330" y="0" width="310" height="36" rx="6" fill="#0f172a" />
            <text x="342" y="23" fill="#f59e0b">CREDIT: [Income] Freelance/Bonus</text>
            <text x="550" y="23" font-weight="700" fill="#34d399">৳ 15,000</text>
          </g>

          <!-- Status badge -->
          <text x="0" y="105" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">Equation Status: <tspan fill="#34d399" font-weight="700">Balanced (Debits = Credits) ✓</tspan></text>
        </g>
      </g>
    </g>

    <!-- General Ledger Audit Trail Table -->
    <g transform="translate(0, 395)">
      <text x="0" y="20" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="800" fill="#ffffff">General Ledger &amp; Trial Balance</text>

      <g transform="translate(0, 35)">
        <rect width="728" height="520" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        
        <!-- Table Header -->
        <rect width="728" height="45" rx="20" fill="#1e293b" />
        <text x="24" y="28" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#94a3b8">Date / Description</text>
        <text x="260" y="28" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#94a3b8">Account Head</text>
        <text x="490" y="28" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#94a3b8">Debit (Dr.)</text>
        <text x="630" y="28" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#94a3b8">Credit (Cr.)</text>

        <!-- Row 1 -->
        <g transform="translate(24, 75)">
          <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="700" fill="#ffffff">Today · House Rent Payment</text>
          <text x="0" y="34" font-family="'Segoe UI', sans-serif" font-size="11" fill="#64748b">Txn Ref #L-9842</text>
          <text x="236" y="24" font-family="monospace" font-size="12" fill="#cbd5e1">Rent Expense</text>
          <text x="466" y="24" font-family="monospace" font-size="13" font-weight="700" fill="#f43f5e">৳ 25,000</text>
          <text x="606" y="24" font-family="monospace" font-size="13" fill="#64748b">—</text>
        </g>
        <line x1="24" y1="125" x2="704" y2="125" stroke="#1e293b" stroke-width="1" />

        <!-- Row 2 -->
        <g transform="translate(24, 150)">
          <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="700" fill="#ffffff">Today · City Bank Payment</text>
          <text x="0" y="34" font-family="'Segoe UI', sans-serif" font-size="11" fill="#64748b">Txn Ref #L-9843</text>
          <text x="236" y="24" font-family="monospace" font-size="12" fill="#cbd5e1">City Bank Savings</text>
          <text x="466" y="24" font-family="monospace" font-size="13" fill="#64748b">—</text>
          <text x="606" y="24" font-family="monospace" font-size="13" font-weight="700" fill="#38bdf8">৳ 25,000</text>
        </g>
        <line x1="24" y1="200" x2="704" y2="200" stroke="#1e293b" stroke-width="1" />

        <!-- Row 3 -->
        <g transform="translate(24, 225)">
          <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="700" fill="#ffffff">Yesterday · Stock Dividend</text>
          <text x="0" y="34" font-family="'Segoe UI', sans-serif" font-size="11" fill="#64748b">Txn Ref #L-9844</text>
          <text x="236" y="24" font-family="monospace" font-size="12" fill="#cbd5e1">Dividend Income</text>
          <text x="466" y="24" font-family="monospace" font-size="13" fill="#64748b">—</text>
          <text x="606" y="24" font-family="monospace" font-size="13" font-weight="700" fill="#34d399">৳ 8,400</text>
        </g>
        <line x1="24" y1="275" x2="704" y2="275" stroke="#1e293b" stroke-width="1" />

        <!-- Summary Footer -->
        <g transform="translate(24, 300)">
          <rect width="680" height="55" rx="10" fill="#1e293b" />
          <text x="20" y="33" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="13" fill="#34d399">Invariant Check: Debits = Credits (৳ 153,400)</text>
          <text x="500" y="33" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="12" fill="#38bdf8">AUDIT PASS ✓</text>
        </g>
      </g>
    </g>
  `
});

// 5. Screenshot 3: Stock Portfolio, DPS & Sanchayapatra - 100% English
const screenshot3Svg = renderScreenshotSvg({
  badgeText: 'INVESTMENT PORTFOLIO',
  badgeColor: '#fbbf24',
  title: 'DSE Stocks, DPS & Sanchayapatra Tracker',
  subtitle: 'Dhaka Stock Exchange, Compound Interest & Tax Reports',
  children: `
    <!-- Top Header -->
    <g transform="translate(0, 0)">
      <text x="0" y="24" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="20" fill="#ffffff">Investments &amp; Portfolio</text>
      <text x="0" y="48" font-family="'Segoe UI', sans-serif" font-size="13" fill="#fbbf24">Live DSE Tracking, Realized/Unrealized P&amp;L, Compound Growth &amp; Tax</text>
    </g>

    <!-- Investment Portfolio Summary Card -->
    <g transform="translate(0, 70)">
      <rect width="728" height="230" rx="22" fill="#161e2e" stroke="#f59e0b" stroke-width="1.8" stroke-opacity="0.8" />
      
      <g transform="translate(28, 28)">
        <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#94a3b8">PORTFOLIO VALUATION</text>
        <text x="0" y="62" font-family="'Segoe UI', sans-serif" font-size="40" font-weight="800" fill="#ffffff">৳ 872,500</text>

        <rect x="440" y="24" width="220" height="38" rx="19" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-opacity="0.5" />
        <text x="550" y="48" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" fill="#34d399">Total Profit: +৳ 74,200 (+9.2%)</text>

        <!-- Breakdown metrics -->
        <g transform="translate(0, 110)">
          <rect x="0" y="0" width="210" height="65" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
          <text x="14" y="24" font-family="'Segoe UI', sans-serif" font-size="11" fill="#94a3b8">DSE Stock Equities</text>
          <text x="14" y="48" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="800" fill="#38bdf8">৳ 450,000</text>

          <rect x="228" y="0" width="210" height="65" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
          <text x="242" y="24" font-family="'Segoe UI', sans-serif" font-size="11" fill="#94a3b8">Sanchayapatra Bonds</text>
          <text x="242" y="48" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="800" fill="#34d399">৳ 250,000</text>

          <rect x="456" y="0" width="210" height="65" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
          <text x="470" y="24" font-family="'Segoe UI', sans-serif" font-size="11" fill="#94a3b8">DPS Scheme (5-Yr)</text>
          <text x="470" y="48" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="800" fill="#fbbf24">৳ 172,500</text>
        </g>
      </g>
    </g>

    <!-- DSE Top Stocks List -->
    <g transform="translate(0, 330)">
      <text x="0" y="20" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="800" fill="#ffffff">Stock Portfolio (Dhaka Stock Exchange)</text>
      
      <!-- Stock 1: GP -->
      <g transform="translate(0, 35)">
        <rect width="728" height="90" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="45" cy="45" r="22" fill="#0284c7" fill-opacity="0.2" />
        <text x="45" y="52" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="14" fill="#38bdf8">GP</text>
        
        <text x="85" y="36" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#ffffff">Grameenphone Ltd.</text>
        <text x="85" y="58" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">800 shares @ avg ৳ 260.50 | CMP ৳ 282.00</text>

        <text x="680" y="38" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#34d399">+৳ 17,200</text>
        <text x="680" y="58" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#34d399">+8.2% ↗</text>
      </g>

      <!-- Stock 2: SQURPHARMA -->
      <g transform="translate(0, 140)">
        <rect width="728" height="90" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="45" cy="45" r="22" fill="#10b981" fill-opacity="0.2" />
        <text x="45" y="52" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="12" fill="#34d399">SQ</text>
        
        <text x="85" y="36" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#ffffff">Square Pharmaceuticals</text>
        <text x="85" y="58" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">1,000 shares @ avg ৳ 212.00 | CMP ৳ 230.50</text>

        <text x="680" y="38" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="18" fill="#34d399">+৳ 18,500</text>
        <text x="680" y="58" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#34d399">+8.7% ↗</text>
      </g>
    </g>

    <!-- DPS & Sanchayapatra Card -->
    <g transform="translate(0, 590)">
      <text x="0" y="20" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="800" fill="#ffffff">DPS &amp; Sanchayapatra Installment Tracker</text>
      
      <g transform="translate(0, 35)">
        <rect width="728" height="180" rx="18" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <g transform="translate(24, 24)">
          <text x="0" y="18" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="16" fill="#fbbf24">Sonali Bank 5-Year DPS</text>
          <text x="0" y="44" font-family="'Segoe UI', sans-serif" font-size="13" fill="#cbd5e1">Monthly Installment: ৳ 10,000 | Compounded Rate: 9.50%</text>

          <!-- Progress Bar -->
          <g transform="translate(0, 65)">
            <rect width="670" height="12" rx="6" fill="#1e293b" />
            <rect width="400" height="12" rx="6" fill="#fbbf24" />
          </g>

          <text x="0" y="110" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">36/60 installments done (60%) | Current Deposit: ৳ 360,000 | Maturity Value: ৳ 745,000</text>
          <rect x="520" y="85" width="150" height="32" rx="8" fill="#10b981" fill-opacity="0.2" />
          <text x="595" y="106" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="12" fill="#34d399">Next Due: 5th of Month</text>
        </g>
      </g>
    </g>
  `
});

// 6. Screenshot 4: Smart Budgets & Shariah Zakat - 100% English
const screenshot4Svg = renderScreenshotSvg({
  badgeText: 'BUDGETS & ZAKAT',
  badgeColor: '#10b981',
  title: 'Smart Budget Variance & Shariah Zakat Calculator',
  subtitle: 'Category Envelopes, Nisab Calculation & 100% Offline Vault',
  children: `
    <!-- Top Header -->
    <g transform="translate(0, 0)">
      <text x="0" y="24" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="20" fill="#ffffff">Budget &amp; Zakat Analytics</text>
      <text x="0" y="48" font-family="'Segoe UI', sans-serif" font-size="13" fill="#10b981">Category Budget Tracking &amp; Precise Shariah-Compliant Zakat Assessment</text>
    </g>

    <!-- Monthly Budget Summary Card -->
    <g transform="translate(0, 70)">
      <rect width="728" height="240" rx="22" fill="#0f1d32" stroke="#10b981" stroke-width="1.8" stroke-opacity="0.7" />
      
      <g transform="translate(28, 28)">
        <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#94a3b8">MONTHLY BUDGET PROGRESS (September 2026)</text>
        <text x="0" y="60" font-family="'Segoe UI', sans-serif" font-size="38" font-weight="800" fill="#ffffff">৳ 42,150 <tspan font-size="22" font-weight="500" fill="#94a3b8">/ ৳ 65,000</tspan></text>
        
        <rect x="480" y="24" width="180" height="38" rx="19" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.5" />
        <text x="570" y="48" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" fill="#34d399">65% of Budget Used</text>

        <!-- Big Master Budget Progress Bar -->
        <g transform="translate(0, 95)">
          <rect width="665" height="16" rx="8" fill="#1e293b" />
          <rect width="430" height="16" rx="8" fill="#10b981" />
        </g>

        <!-- Sub categories variance -->
        <g transform="translate(0, 135)">
          <text x="0" y="16" font-family="'Segoe UI', sans-serif" font-size="12" fill="#cbd5e1">Food &amp; Groceries: ৳ 15,200 / 20,000 (76%)</text>
          <text x="350" y="16" font-family="'Segoe UI', sans-serif" font-size="12" fill="#cbd5e1">Utilities &amp; Bills: ৳ 5,000 / 8,000 (62%)</text>
        </g>
      </g>
    </g>

    <!-- Shariah Zakat Calculator Card -->
    <g transform="translate(0, 340)">
      <text x="0" y="20" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="800" fill="#ffffff">Shariah Zakat Assessment (Haul 1-Year Completed)</text>

      <g transform="translate(0, 35)">
        <rect width="728" height="330" rx="20" fill="#0f172a" stroke="#f59e0b" stroke-width="1.8" stroke-opacity="0.7" />
        
        <g transform="translate(26, 26)">
          <!-- Nisab Threshold Banner -->
          <rect width="670" height="50" rx="12" fill="#1e293b" />
          <circle cx="25" cy="25" r="12" fill="#f59e0b" />
          <text x="25" y="30" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="12" fill="#ffffff">⚖</text>
          <text x="48" y="30" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="13" fill="#fbbf24">Current Nisab Threshold (Silver 52.5 Tola): ৳ 120,000 (Threshold Exceeded)</text>

          <!-- Zakatable Asset Items -->
          <g transform="translate(0, 75)">
            <g transform="translate(0, 0)">
              <text x="0" y="18" font-family="'Segoe UI', sans-serif" font-size="14" fill="#cbd5e1">Cash in Hand &amp; Bank Deposits</text>
              <text x="660" y="18" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#ffffff">৳ 850,000</text>
            </g>
            <line x1="0" y1="32" x2="670" y2="32" stroke="#1e293b" />

            <g transform="translate(0, 48)">
              <text x="0" y="18" font-family="'Segoe UI', sans-serif" font-size="14" fill="#cbd5e1">Gold &amp; Silver Jewellery (Above personal use)</text>
              <text x="660" y="18" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#ffffff">৳ 200,000</text>
            </g>
            <line x1="0" y1="80" x2="670" y2="80" stroke="#1e293b" />

            <g transform="translate(0, 96)">
              <text x="0" y="18" font-family="'Segoe UI', sans-serif" font-size="14" fill="#cbd5e1">DSE Stocks &amp; Business Capital</text>
              <text x="660" y="18" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="14" fill="#ffffff">৳ 224,000</text>
            </g>
            <line x1="0" y1="128" x2="670" y2="128" stroke="#1e293b" />
          </g>

          <!-- Payable Zakat Result Box -->
          <g transform="translate(0, 225)">
            <rect width="670" height="60" rx="12" fill="#047857" fill-opacity="0.25" stroke="#10b981" stroke-width="1.5" />
            <text x="24" y="38" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="16" fill="#34d399">Total Payable Zakat (at 2.5%):</text>
            <text x="645" y="38" text-anchor="end" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="24" fill="#34d399">৳ 31,850</text>
          </g>
        </g>
      </g>
    </g>

    <!-- Offline Privacy & Security Guarantee -->
    <g transform="translate(0, 715)">
      <rect width="728" height="95" rx="18" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <g transform="translate(24, 24)">
        <circle cx="24" cy="24" r="22" fill="#10b981" fill-opacity="0.15" />
        <path d="M24 12 L34 16 L34 26 C34 32 24 37 24 37 C24 37 14 32 14 26 L14 16 Z" fill="#10b981" />
        <text x="64" y="20" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="15" fill="#ffffff">100% Privacy &amp; Local-First Database</text>
        <text x="64" y="42" font-family="'Segoe UI', sans-serif" font-size="12" fill="#94a3b8">Your financial data is stored locally on your device and never uploaded to any remote server.</text>
      </g>
    </g>
  `
});

async function main() {
  console.log('Generating Play Store Graphic Assets (SVG & PNG) in 100% English...');

  // Save SVGs
  fs.writeFileSync(path.join(outputDir, 'app_icon_512x512.svg'), iconSvg.trim());
  fs.writeFileSync(path.join(outputDir, 'feature_graphic_1024x500.svg'), featureSvg.trim());
  fs.writeFileSync(path.join(outputDir, 'screenshot_1_dashboard.svg'), screenshot1Svg.trim());
  fs.writeFileSync(path.join(outputDir, 'screenshot_2_ledger.svg'), screenshot2Svg.trim());
  fs.writeFileSync(path.join(outputDir, 'screenshot_3_investments.svg'), screenshot3Svg.trim());
  fs.writeFileSync(path.join(outputDir, 'screenshot_4_budgets_zakat.svg'), screenshot4Svg.trim());

  console.log('Rendering PNGs with Sharp at exact Google Play specifications...');

  // 1. App Icon: 512 x 512 PNG (32-bit)
  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outputDir, 'app_icon_512x512.png'));
  console.log('✓ Created app_icon_512x512.png (512x512)');

  // 2. Feature Graphic: 1024 x 500 PNG
  await sharp(Buffer.from(featureSvg))
    .resize(1024, 500)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outputDir, 'feature_graphic_1024x500.png'));
  console.log('✓ Created feature_graphic_1024x500.png (1024x500)');

  // 3. Screenshot 1: 1080 x 1920 PNG
  await sharp(Buffer.from(screenshot1Svg))
    .resize(1080, 1920)
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'screenshot_1_dashboard_1080x1920.png'));
  console.log('✓ Created screenshot_1_dashboard_1080x1920.png (1080x1920)');

  // 4. Screenshot 2: 1080 x 1920 PNG
  await sharp(Buffer.from(screenshot2Svg))
    .resize(1080, 1920)
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'screenshot_2_ledger_1080x1920.png'));
  console.log('✓ Created screenshot_2_ledger_1080x1920.png (1080x1920)');

  // 5. Screenshot 3: 1080 x 1920 PNG
  await sharp(Buffer.from(screenshot3Svg))
    .resize(1080, 1920)
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'screenshot_3_investments_1080x1920.png'));
  console.log('✓ Created screenshot_3_investments_1080x1920.png (1080x1920)');

  // 6. Screenshot 4: 1080 x 1920 PNG
  await sharp(Buffer.from(screenshot4Svg))
    .resize(1080, 1920)
    .png({ quality: 100 })
    .toFile(path.join(outputDir, 'screenshot_4_budgets_zakat_1080x1920.png'));
  console.log('✓ Created screenshot_4_budgets_zakat_1080x1920.png (1080x1920)');

  console.log('ALL GOOGLE PLAY ASSETS GENERATED IN ENGLISH SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Failed to generate Play Store assets:', err);
  process.exit(1);
});
