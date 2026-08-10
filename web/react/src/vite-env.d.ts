/// <reference types="vite/client" />

// SVG 作为 React 组件导入
declare module '*.svg?react' {
  import React from 'react'
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>
  export default SVGComponent
}

// SVG 原始字符串导入（相对路径引用本地 svg 文件，保留 currentColor 能力）
declare module '*.svg?raw' {
  const src: string
  export default src
}

// 图片文件导入
declare module '*.svg' {
  const src: string
  export default src
}
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.webp' {
  const src: string
  export default src
}