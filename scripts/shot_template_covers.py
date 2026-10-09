#!/usr/bin/env python3
"""
对「网页搭建」模板的构建产物做真实渲染截图，作为商城卡片封面。

为什么用 Playwright 而不是原型的 SVG 占位图
------------------------------------------
卖的是设计模板，卡片封面必须让人一眼看到真实版式。真实渲染需要浏览器：
源站可用内存长期只有 300MB 左右，跑 Chromium 会把占用顶到 80% 红线以上，
所以截图一律在 CI（GitHub Actions）里做，产物随构建一起提交，源站只做静态托管。

输入 / 输出
----------
读 web/react/public/templates/<slug>/index.html（vite-plugin-singlefile 产出的自包含单文件）
写 web/react/public/templates/<slug>/cover.jpg

用法
----
    pip install playwright && playwright install --with-deps chromium
    python3 scripts/shot_template_covers.py
    python3 scripts/shot_template_covers.py bevel-design-style-reference   # 只截一个
"""

import asyncio
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL_DIR = os.path.join(REPO_ROOT, 'web', 'react', 'public', 'templates')

# 截图视口：4:3 卡片比例，宽度取桌面端常见值，保证 Hero 完整入镜
VIEW_W, VIEW_H = 1440, 1080
JPEG_QUALITY = 82


async def shoot(page, html_path, out_path):
    # 单文件模板用相对资源（data: / 内联），file:// 直接打开即可，无需起本地 server
    await page.goto('file://' + html_path, wait_until='load')
    # 给字体加载与入场动画留时间，避免截到半成品
    await page.wait_for_timeout(2500)
    await page.screenshot(path=out_path, type='jpeg', quality=JPEG_QUALITY)
    return os.path.getsize(out_path)


async def main(slugs):
    # 延迟导入：本地无 playwright 时不阻断 build 脚本
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
        try:
            page = await browser.new_page(viewport={'width': VIEW_W, 'height': VIEW_H})
            for slug in slugs:
                html_path = os.path.join(TPL_DIR, slug, 'index.html')
                if not os.path.isfile(html_path):
                    print('  ! 跳过（未构建）:', slug)
                    continue
                out_path = os.path.join(TPL_DIR, slug, 'cover.jpg')
                size = await shoot(page, html_path, out_path)
                print('  + %s/cover.jpg  %.0fKB' % (slug, size / 1024))
        finally:
            await browser.close()


if __name__ == '__main__':
    if len(sys.argv) > 1:
        targets = sys.argv[1:]
    else:
        targets = sorted(
            d for d in os.listdir(TPL_DIR)
            if os.path.isfile(os.path.join(TPL_DIR, d, 'index.html'))
        )
    if not targets:
        print('没有可截图的模板（先跑 scripts/build_shop_templates.sh）')
        raise SystemExit(1)
    asyncio.run(main(targets))
