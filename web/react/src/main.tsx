import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 自托管 Playfair Display（SIL OFL 开源，可商用），替代 Google Fonts 外部依赖：
// Vite 构建时自动哈希打包，生产零 404；font-family 名仍为 'Playfair Display'，组件无需改动。
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import './assets/global.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
