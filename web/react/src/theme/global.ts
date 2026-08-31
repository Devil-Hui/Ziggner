/**
 * 全局样式注入 (styled-components)
 * 补充 global.css，处理需要动态令牌的样式。
 * 在 App.tsx 中引入 <GlobalStyles /> 即可。
 */

import { createGlobalStyle } from 'styled-components'
import { Color, FontFamily, FontSize, Type, Transition } from './tokens'

export const GlobalStyles = createGlobalStyle`
  html {
    font-size: ${FontSize.base}px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${FontFamily.sans};
    color: ${Color.text.body};
    background: ${Color.bg.page};
    line-height: 1.6;
  }

  h1, h2, h3, h4 {
    font-family: ${FontFamily.display};
    ${Type.tight}
  }

  /* 价格/统计等数字统一等宽，防跳动 */
  [data-num] {
    ${Type.tnum}
  }

  a {
    color: ${Color.text.link};
    text-decoration: none;
    transition: color ${Transition.fast};

    &:hover {
      color: ${Color.primaryHover};
    }
  }

  button {
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
  }

  /* ── Focus ring for keyboard navigation ── */
  :focus-visible {
    outline: 2px solid ${Color.focus};
    outline-offset: 2px;
  }

  /* Remove focus ring for mouse/touch users */
  :focus:not(:focus-visible) {
    outline: none;
  }

  /* ── Scrollbar (styled-components version) ── */
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: ${Color.bg.page};
  }
  ::-webkit-scrollbar-thumb {
    background: ${Color.border.medium};
    border-radius: 3px;
  }

  /* ── A11y: 尊重系统减弱动效偏好（关闭骨架扫光/滑入/缩放等动画） ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`
