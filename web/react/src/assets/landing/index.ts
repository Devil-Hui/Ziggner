/**
 * 落地页实拍图资源（源自设计蓝本 like，已本地化随包构建）。
 * ─────────────────────────────────────────────────────────
 * 为什么本地打包：页面由 Cloudflare Pages 静态托管，
 * 历史坑 —— Unsplash 外链无法加载，才逼出「纯 CSS 模拟画面」的旧方案。
 * 因此这里一律用 Vite import，禁止任何外链 URL。
 */

import agentCompetitor from './agent-competitor.jpg'
import authLogin from './auth-bg.jpg'
import authRegister from './auth-register.jpg'
import agentMarketing from './agent-marketing.jpg'
import agentSite from './agent-site.jpg'
import brandProducts from './brand-products.jpg'
import clipAi from './clip-ai.jpg'
import clipRaw from './clip-raw.jpg'
import creatorDesk from './creator-desk.jpg'
import journey from './journey.jpg'
import pathFaceless from './path-faceless.jpg'
import pathOptimized from './path-optimized.jpg'
import pathTwin from './path-twin.jpg'

export interface LandingImage {
  src: string
  /** 无障碍描述：必须描述画面内容，勿用 "image" 之类占位 */
  alt: string
}

export const landingImages = {
  /** 电商智能体 —— 快速竞品分析 */
  agentCompetitor: {
    src: agentCompetitor,
    alt: 'E-commerce competitor analysis dashboard with price and sales charts',
  },
  /** 登录页 —— 服装零售店陈列场景 */
  authLogin: {
    src: authLogin,
    alt: 'Retail boutique interior with curated garments on display',
  },
  /** 注册页 —— 时尚模特提购物袋 */
  authRegister: {
    src: authRegister,
    alt: 'Fashion shopper in a burgundy coat carrying paper shopping bags',
  },
  /** 电商智能体 —— 快速网站搭建 */
  agentSite: {
    src: agentSite,
    alt: 'Drag-and-drop e-commerce website builder interface on a laptop',
  },
  /** 电商智能体 —— 智能运营营销 */
  agentMarketing: {
    src: agentMarketing,
    alt: 'E-commerce marketing automation dashboard with chat and analytics',
  },
  /** AI 优化后的竖版成片（明亮、主体居中） */
  clipAi: {
    src: clipAi,
    alt: 'AI-optimized vertical video frame, bright and centered',
  },
  /** 未经处理的原始素材（画面偏暗、构图不稳） */
  clipRaw: {
    src: clipRaw,
    alt: 'Raw unedited vertical video frame, dull and off-center',
  },
  /** 三条创作者路径 —— 不出镜模式 */
  pathFaceless: {
    src: pathFaceless,
    alt: 'Faceless creator setup filming overhead content on a desk',
  },
  /** 三条创作者路径 —— AI 优化模式 */
  pathOptimized: {
    src: pathOptimized,
    alt: 'Creator reviewing an AI-optimized clip on a phone',
  },
  /** 三条创作者路径 —— AI 分身模式 */
  pathTwin: {
    src: pathTwin,
    alt: 'AI twin avatar preview on a studio monitor',
  },
  /** 六步成长历程 */
  journey: {
    src: journey,
    alt: 'Creator workspace showing the six-step content journey',
  },
  /** 品牌任务市场 —— 商品陈列 */
  brandProducts: {
    src: brandProducts,
    alt: 'Shelved brand products awaiting creator campaign pickup',
  },
  /** 创作者工作台 / 榜单 */
  creatorDesk: {
    src: creatorDesk,
    alt: 'Creator desk with analytics dashboard and payout summary',
  },
  } as const satisfies Record<string, LandingImage>

export type LandingImageKey = keyof typeof landingImages

export default landingImages
