import type { SVGProps } from 'react'

/**
 * 線性 SVG 圖標集（24×24，stroke 為 currentColor）
 * 零依賴：專案未安裝圖標庫且無法新增依賴，故手寫。
 */

type P = SVGProps<SVGSVGElement>

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconSparkles = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
    <path d="M18 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" />
  </svg>
)

export const IconHook = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 4v9a8 8 0 0 0 16 0" />
    <circle cx="20" cy="4" r="2" />
  </svg>
)

export const IconMessage = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12z" />
    <path d="M8 10h8M8 14h5" />
  </svg>
)

export const IconFilm = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
  </svg>
)

export const IconMegaphone = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 11l14-6v14L3 13z" />
    <path d="M3 11v2a2 2 0 0 0 2 2h1l-1 4 4-4" />
    <path d="M7 6.5L20 4v16l-13-2.5" />
  </svg>
)

export const IconUser = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)

export const IconMoon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z" />
  </svg>
)

export const IconZap = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
)

export const IconMic = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
  </svg>
)

export const IconClapper = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
    <path d="M3 8l4-5 5 5 5-5 4 5" />
  </svg>
)

export const IconUpload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

export const IconChart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 21h18" />
    <path d="M6 21V10M11 21V4M16 21v-7" />
  </svg>
)

export const IconClock = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

export const IconArrowRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconPlay = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5v-7z" />
  </svg>
)

export const IconStar = (p: P) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <path d="M12 2.5l2.9 5.9 6.6.9-4.8 4.6 1.2 6.5L12 17.3 6.1 20.4l1.2-6.5L2.5 9.3l6.6-.9L12 2.5z" />
  </svg>
)

export const IconTrend = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
)

export const IconUsers = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20a7 7 0 0 1 14 0" />
    <path d="M16 5.5a3.5 3.5 0 0 1 0 7M18 20a7 7 0 0 0-2.5-5.4" />
  </svg>
)

export const IconEye = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconWallet = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M16 12h3v4h-3a2 2 0 0 1 0-4z" />
  </svg>
)

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)

export const IconLayers = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </svg>
)

export const IconShield = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
