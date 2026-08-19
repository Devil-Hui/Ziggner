/**
 * E2E：商城关键路径（首页 → 商品详情）。
 * 公网目标（E2E_BASE_URL 可覆盖）；CI 中无头 chromium 运行。
 */
import { test, expect } from '@playwright/test'

test.describe('商城关键路径', () => {
  test('首页可访问并渲染商品区', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Ziggner/)
    // 页面骨架渲染（类目/搜索/导航任一出现）
    await expect(page.locator('body')).toContainText(/CATEGORIES|Categories|搜索|Search/)
  })

  test('进入商品详情页（通过热门接口定位上架商品）', async ({ page, request }) => {
    // 从公开 hot 接口拿第一个上架商品的 SPU id（hot 返回 SKU，取其 spu 维度）
    const resp = await request.get(`${process.env.E2E_API_URL || 'https://api.ziggner.com/api/v1'}/goods/hot?limit=1`)
    expect(resp.ok()).toBeTruthy()
    const body = await resp.json()
    const items = Array.isArray(body) ? body : body?.data || []
    const sku = items[0]
    test.skip(!sku, '线上无上架商品')

    // SKU → SPU：通过 sku 详情接口拿到 spu_id
    const skuResp = await request.get(`${process.env.E2E_API_URL || 'https://api.ziggner.com/api/v1'}/goods/sku/${sku.id}`)
    expect(skuResp.ok()).toBeTruthy()
    const skuData = await skuResp.json()
    const spuId = skuData?.spu_id

    await page.goto(`/product/${spuId}`)
    await expect(page.locator('body')).not.toContainText('Product Not Found')
    // 详情页关键元素：加购按钮或价格任一出现
    const bodyText = await page.locator('body').innerText()
    expect(/(Add to Cart|加入购物车)|[\d]+\.[\d]{2}/.test(bodyText)).toBeTruthy()
  })
})
