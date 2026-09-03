import { useRef, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize } from '../../../../theme/tokens'
import { useTranslation } from '@/i18n'

// ── 模板数据 ──
export interface TemplateSection {
  id: string
  type: 'hero' | 'features' | 'grid' | 'text' | 'banner'
  title: string
  subtitle?: string
  image?: string
  items?: { title: string; desc: string; image?: string }[]
  backgroundColor?: string
  textColor?: string
}

export interface TemplateConfig {
  sections: TemplateSection[]
}

const Iframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.page};
`

// ── 生成预览 HTML ──
function generatePreviewHTML(config: TemplateConfig): string {
  const sectionsHTML = config.sections.map(s => {
    switch (s.type) {
      case 'hero':
        return `<div style="background:${s.backgroundColor || 'linear-gradient(135deg, #667eea, #764ba2)'};color:${s.textColor || '#fff'};padding:60px 40px;text-align:center;border-radius:8px;margin-bottom:20px">
          ${s.image ? `<img src="${s.image}" alt="" style="max-width:200px;height:auto;margin-bottom:20px;border-radius:8px"/>` : ''}
          <h1 style="font-size:32px;margin:0 0 12px">${s.title || '主标题'}</h1>
          <p style="font-size:16px;opacity:0.9;margin:0">${s.subtitle || '副标题描述'}</p>
        </div>`

      case 'features':
        const items = s.items || [{ title: '特性1', desc: '描述' }, { title: '特性2', desc: '描述' }, { title: '特性3', desc: '描述' }]
        return `<div style="padding:40px 20px;background:${s.backgroundColor || '#fff'};color:${s.textColor || '#333'};margin-bottom:20px">
          <h2 style="text-align:center;font-size:24px;margin:0 0 30px">${s.title || '功能特性'}</h2>
          <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center">
            ${items.map(i => `<div style="flex:1;min-width:200px;max-width:300px;padding:20px;background:#f8f9fa;border-radius:8px;text-align:center">
              ${i.image ? `<img src="${i.image}" alt="" style="width:60px;height:60px;border-radius:8px;margin-bottom:12px"/>` : ''}
              <h3 style="font-size:18px;margin:0 0 8px">${i.title}</h3>
              <p style="font-size:14px;color:#666;margin:0">${i.desc}</p>
            </div>`).join('')}
          </div>
        </div>`

      case 'grid':
        const gridItems = s.items || [{ title: '产品1', desc: '描述' }, { title: '产品2', desc: '描述' }, { title: '产品3', desc: '描述' }, { title: '产品4', desc: '描述' }]
        return `<div style="padding:40px 20px;background:${s.backgroundColor || '#f8f9fa'};color:${s.textColor || '#333'};margin-bottom:20px">
          <h2 style="text-align:center;font-size:24px;margin:0 0 30px">${s.title || '产品展示'}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px">
            ${gridItems.map(i => `<div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
              ${i.image ? `<img src="${i.image}" alt="" style="width:100%;height:160px;object-fit:cover"/>` : `<div style="width:100%;height:160px;background:#e0e0e0;display:flex;align-items:center;justify-content:center;color:#999">图片</div>`}
              <div style="padding:16px"><h3 style="font-size:16px;margin:0 0 8px">${i.title}</h3><p style="font-size:13px;color:#999;margin:0">${i.desc}</p></div>
            </div>`).join('')}
          </div>
        </div>`

      case 'text':
        return `<div style="padding:40px;background:${s.backgroundColor || '#fff'};color:${s.textColor || '#333'};margin-bottom:20px">
          <h2 style="font-size:24px;margin:0 0 16px">${s.title || '文字模块'}</h2>
          <p style="font-size:15px;line-height:1.8;color:#666">${s.subtitle || '这是一段文字内容。你可以在这里编辑正文。'}</p>
        </div>`

      case 'banner':
        return `<div style="background:${s.backgroundColor || '#e74c3c'};color:${s.textColor || '#fff'};padding:40px;text-align:center;border-radius:8px;margin-bottom:20px">
          <h2 style="font-size:28px;margin:0 0 12px">${s.title || '促销横幅'}</h2>
          <p style="font-size:16px;opacity:0.9;margin:0 0 20px">${s.subtitle || '限时优惠，立即查看'}</p>
          <a href="#" style="display:inline-block;padding:12px 30px;background:#fff;color:#e74c3c;border-radius:4px;text-decoration:none;font-weight:600">立即查看</a>
        </div>`

      default: return ''
    }
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px}
  </style></head><body>${sectionsHTML}</body></html>`
}

// ── 组件 ──
interface TemplatePreviewProps {
  config: TemplateConfig
  style?: React.CSSProperties
}

export default function TemplatePreview({ config, style }: TemplatePreviewProps) {
  const { t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState('')

  useEffect(() => {
    setHtml(generatePreviewHTML(config))
  }, [config])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !html) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
  }, [html])

  return <Iframe ref={iframeRef} style={style} title={t('admin.templatePreview.pagePreview')} />
}

export { generatePreviewHTML }