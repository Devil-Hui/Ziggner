#!/usr/bin/env python3
"""
生成「网页搭建」模板商品的封面图（纯 SVG，无第三方依赖、不启动浏览器）。

用途
----
shop_templates 下的 5 个模板上架时 SPU.main_image 为空，商城列表/卡片会渲染成空白。
在 2GB 内存的源站上跑 headless Chromium 截图会直接顶到内存上限，因此封面改为
纯矢量生成：零内存开销、秒级产出、任意分辨率不失真。

产出
----
templates_static/<slug>/cover.svg   —— 由 nginx 经 https://api.ziggner.com/templates/ 直出

用法
----
    python3 scripts/gen_template_covers.py            # 覆盖写入
    python3 scripts/gen_template_covers.py --dry-run  # 只打印将要写入的文件

若要换成真实渲染截图，只需在 CI（GitHub Actions）里用 Playwright 覆盖同名文件即可，
前端与 seed 命令无需改动 —— 它们只认 `templates_static/<slug>/cover.*` 这一路径。
"""

import argparse
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(REPO_ROOT, 'templates_static')

# slug -> (中文名, 英文名, 家族标签, 主色, 次色, 强调色)
TEMPLATES = [
    dict(
        slug='bevel-design-style-reference',
        name='Bevel 设计风格参考模板',
        name_en='Bevel Design Style Reference',
        family='Bevel',
        c1='#222326', c2='#3d4a63', accent='#ffca00', paper='#fff9ee',
    ),
    dict(
        slug='bevel-design-style-reference-qwen3.8',
        name='Bevel 设计风格参考模板 (Qwen 3.8)',
        name_en='Bevel Design Style Reference (Qwen 3.8)',
        family='Bevel',
        c1='#1b1d22', c2='#2f4258', accent='#ffab94', paper='#f4f7fc',
    ),
    dict(
        slug='light-shop-design-system-clude5.5',
        name='Light Shop 设计系统 (Cluade 5.5)',
        name_en='Light Shop Design System (Cluade 5.5)',
        family='Light Shop',
        c1='#f2f4f5', c2='#dfe3e8', accent='#c0b5f3', paper='#ffffff',
    ),
    dict(
        slug='light-shop-design-system-gpt-6-luna-max',
        name='Light Shop 设计系统 (GPT-6-Luna-Max)',
        name_en='Light Shop Design System (GPT-6-Luna-Max)',
        family='Light Shop',
        c1='#eef1f3', c2='#c9ced6', accent='#8f7ce8', paper='#ffffff',
    ),
    dict(
        slug='mollie-design-style-reference',
        name='Mollie 设计风格参考模板',
        name_en='Mollie Design Style Reference',
        family='Mollie',
        c1='#254764', c2='#3b281d', accent='#e7c9a9', paper='#f7f4f1',
    ),
]

W, H = 1200, 900


def _esc(text: str) -> str:
    return (text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


def build_svg(t):
    light = t['family'] == 'Light Shop'
    ink = '#1b1d22' if light else '#ffffff'
    ink_soft = 'rgba(27,29,34,0.55)' if light else 'rgba(255,255,255,0.62)'

    c1 = t['c1']
    c2 = t['c2']
    accent = t['accent']
    # 页面骨架：浏览器窗口 + Hero + 三张商品卡，用品牌色抽象表达版式
    card_fill = t['paper'] if light else 'rgba(255,255,255,0.12)'
    name = _esc(t['name'])
    name_en = _esc(t['name_en'])
    family = _esc(t['family'])
    chip_w = 140 + len(t['family']) * 16
    chip_ink = '#ffffff' if light else '#1b1d22'

    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{name}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="{accent}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="{accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="{W}" height="{H}" fill="url(#bg)"/>
  <circle cx="1080" cy="120" r="260" fill="{accent}" opacity="0.10"/>
  <circle cx="120" cy="820" r="200" fill="{accent}" opacity="0.08"/>

  <!-- 浏览器窗口 -->
  <rect x="90" y="150" width="1020" height="560" rx="28" fill="{card_fill}"/>
  <rect x="90" y="150" width="1020" height="560" rx="28" fill="none" stroke="{accent}" stroke-opacity="0.35"/>
  <circle cx="146" cy="196" r="10" fill="{accent}" opacity="0.9"/>
  <circle cx="182" cy="196" r="10" fill="{accent}" opacity="0.6"/>
  <circle cx="218" cy="196" r="10" fill="{accent}" opacity="0.35"/>
  <rect x="262" y="182" width="420" height="28" rx="14" fill="{accent}" opacity="0.18"/>

  <!-- Hero -->
  <rect x="150" y="256" width="420" height="34" rx="10" fill="{ink}" opacity="0.9"/>
  <rect x="150" y="308" width="330" height="34" rx="10" fill="{ink}" opacity="0.55"/>
  <rect x="150" y="372" width="240" height="20" rx="10" fill="{ink}" opacity="0.30"/>
  <rect x="150" y="410" width="180" height="60" rx="30" fill="{accent}"/>
  <rect x="700" y="256" width="360" height="240" rx="20" fill="url(#glow)"/>
  <rect x="700" y="256" width="360" height="240" rx="20" fill="none" stroke="{accent}" stroke-opacity="0.4"/>

  <!-- 商品卡 -->
  <rect x="150" y="530" width="270" height="140" rx="18" fill="{accent}" opacity="0.22"/>
  <rect x="450" y="530" width="270" height="140" rx="18" fill="{accent}" opacity="0.16"/>
  <rect x="750" y="530" width="270" height="140" rx="18" fill="{accent}" opacity="0.10"/>

  <!-- 标题 -->
  <text x="90" y="778" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="46" font-weight="700" fill="{ink}">{name}</text>
  <text x="90" y="828" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="24" fill="{ink_soft}">{name_en}</text>
  <rect x="90" y="852" width="{chip_w}" height="40" rx="20" fill="{accent}"/>
  <text x="118" y="879" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="22" font-weight="600" fill="{chip_ink}">{family}</text>
</svg>
'''.format(
        W=W, H=H, name=name, name_en=name_en, family=family,
        c1=c1, c2=c2, accent=accent, card_fill=card_fill,
        ink=ink, ink_soft=ink_soft, chip_w=chip_w, chip_ink=chip_ink,
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    for t in TEMPLATES:
        out_dir = os.path.join(OUT_ROOT, t['slug'])
        out_file = os.path.join(out_dir, 'cover.svg')
        if args.dry_run:
            print('[dry]', out_file)
            continue
        os.makedirs(out_dir, exist_ok=True)
        with open(out_file, 'w', encoding='utf-8') as fh:
            fh.write(build_svg(t))
        print('  +', os.path.relpath(out_file, REPO_ROOT), f'{os.path.getsize(out_file) / 1024:.1f}KB')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
