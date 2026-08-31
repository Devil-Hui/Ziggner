import styled from 'styled-components'
import { Ink, Font } from './editorial'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import Hero from './components/Hero'
import Optimizer from './components/Optimizer'
import Paths from './components/Paths'
import Journey from './components/Journey'
import Monetize from './components/Monetize'
import Closing from './components/Closing'

/**
 * Ziggner — 創作者落地頁
 * ─────────────────────────────────────────────────────────
 * 敘事結構（認知 → 信任 → 轉化）：
 *   Hero        價值主張 + 產品畫面前置 + 社交證明
 *   Results     真實數據與創作者歷程
 *   Optimizer   AI 優化前後對比 + 核心功能
 *   Paths       三條創作者路徑
 *   Journey     六步流程 + AI 智能體團隊
 *   Monetize    品牌任務 + 創作者榜單
 *   Closing     紫色 CTA 收尾
 */
const Page = styled.div`
  background: ${Ink.paper};
  font-family: ${Font.body};
  color: ${Ink.black};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  h1,
  h2,
  h3 {
    text-wrap: balance;
  }

  p {
    text-wrap: pretty;
  }
`

export default function Home() {
  return (
    <PageLayout>
      <Page>
        <main>
          <Hero />
          <Optimizer />
          <Paths />
          <Journey />
          <Monetize />
          <Closing />
        </main>
      </Page>
    </PageLayout>
  )
}
