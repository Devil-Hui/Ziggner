// 全局配置常量

export const SITE_NAME = 'Ziggner'

export const PAGE_SIZE = 20

// 游客（未登录用户）最大可浏览页数
export const GUEST_MAX_PAGES = 3

// 热门商品展示数量
export const HOT_PRODUCTS_COUNT = 8

// 促销标签常量
export const PROMO_TAG = {
  SALE: 'SALE',
  NEW: 'NEW',
  HOT: 'HOT',
  LIMITED: 'LIMITED',
  FEATURED: 'FEATURED',
} as const

export const BREAKPOINTS = {
  desktop: 1200,
  tablet: 768,
  mobile: 576,
} as const