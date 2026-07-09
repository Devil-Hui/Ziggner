/**
 * 全局样式注入 (styled-components)
 * 补充 global.css，处理需要动态令牌的样式。
 * 在 App.tsx 中引入 <GlobalStyles /> 即可。
 */

import { createGlobalStyle } from 'styled-components'
import { Color, FontSize, FocusRing, Transition } from './tokens'

export const GlobalStyles = createGlobalStyle`
  html {
    font-size: ${FontSize.base}px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
    color: ${Color.text.body};
    background: ${Color.bg.page};
    line-height: 1.6;
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
`
