import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from '../../i18n'
import { adminAPI, type EmailTemplateItem } from '../../api/admin'
import { Color, Radius, Shadow, FontSize, Spacing } from '../../theme/tokens'
import { Input, PrimaryBtn as SaveBtn } from '../../components/admin/common/ui'
import { ConfirmDialog } from '../../components/admin/design-system'

/* ───────────────────────── 布局 ───────────────────────── */
const Wrap = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
  box-sizing: border-box;
`

const Sidebar = styled.aside`
  width: 200px;
  flex: 0 0 200px;
  background: #fff;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.card};
  overflow: hidden;
`

const SidebarTitle = styled.div`
  padding: 14px 16px;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${Color.text.secondary};
  border-bottom: 1px solid ${Color.border.light};
`

const TplItem = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  border: none;
  background: ${p => (p.$active ? Color.primary + '0f' : 'transparent')};
  border-left: 3px solid ${p => (p.$active ? Color.primary : 'transparent')};
  color: ${p => (p.$active ? Color.primary : Color.text.heading)};
  font-size: 0.9rem;
  font-weight: ${p => (p.$active ? 600 : 400)};
  cursor: pointer;
  &:hover { background: ${Color.primary}0a; }
`

const EditorCol = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
`

const Title = styled.h1`
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
`

const SubjectInput = styled(Input)`
  margin-bottom: 12px;
`

const CanvasCard = styled.div`
  background: #f3f4f6;
  border-radius: ${Radius.lg}px;
  padding: 24px;
  box-shadow: ${Shadow.card};
`

const PreviewLabel = styled.div`
  font-size: 0.78rem;
  color: ${Color.text.muted};
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`

// 邮件正文画布：固定 600px（主流邮件客户端宽度），所见即所得
const Canvas = styled.div`
  width: 600px;
  max-width: 100%;
  margin: 0 auto;
  min-height: 420px;
  background: #fff;
  border-radius: 8px;
  padding: 28px;
  box-sizing: border-box;
  font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: #1f2329;
  outline: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  &:focus { box-shadow: 0 0 0 3px rgba(26,86,219,0.18); }
  h1 { font-size: 24px; margin: 0 0 14px; }
  h2 { font-size: 19px; margin: 0 0 12px; }
  p { margin: 0 0 12px; }
  a.btn { display: inline-block; background: ${Color.primary}; color: #fff !important;
    padding: 10px 26px; border-radius: 6px; text-decoration: none; font-weight: 600; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
`

const CodeArea = styled.textarea`
  width: 600px;
  max-width: 100%;
  margin: 0 auto;
  display: block;
  min-height: 420px;
  border: 1px solid ${Color.border.medium};
  border-radius: 8px;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
  resize: vertical;
`

const PreviewFrame = styled.iframe`
  width: 600px;
  max-width: 100%;
  height: 520px;
  margin: 0 auto;
  display: block;
  border: 1px solid ${Color.border.light};
  border-radius: 8px;
  background: #fff;
`

const BottomBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
`

const GhostBtn = styled.button`
  padding: 8px 14px;
  background: #fff;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: 0.88rem;
  cursor: pointer;
  color: ${Color.text.heading};
  &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }
`

const SegBtn = styled.button<{ $on?: boolean }>`
  padding: 6px 14px;
  background: ${p => (p.$on ? Color.primary : '#fff')};
  color: ${p => (p.$on ? '#fff' : Color.text.heading)};
  border: 1px solid ${p => (p.$on ? Color.primary : Color.border.medium)};
  border-radius: ${Radius.sm}px;
  font-size: 0.85rem;
  cursor: pointer;
  &:hover { border-color: ${Color.primary}; }
`

/* ───────────────────────── 右侧调色板 ───────────────────────── */
const Palette = styled.aside`
  width: 248px;
  flex: 0 0 248px;
  position: sticky;
  top: 16px;
  background: #fff;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.card};
  padding: 14px;
  box-sizing: border-box;
`

const PaletteTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${Color.text.heading};
  margin: 4px 0 10px;
`

const Group = styled.div`
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${Color.border.light};
  &:last-child { border-bottom: none; margin-bottom: 0; }
`

const GroupLabel = styled.div`
  font-size: 0.72rem;
  color: ${Color.text.muted};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const BtnRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const ToolBtn = styled.button`
  min-width: 38px;
  height: 34px;
  padding: 0 10px;
  background: #f7f8fa;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  font-size: 0.85rem;
  cursor: pointer;
  color: ${Color.text.heading};
  &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }
  &:active { background: ${Color.primary}1a; }
`

const Swatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Swatch = styled.button<{ $c: string }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${p => p.$c};
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px ${Color.border.medium};
  cursor: pointer;
  &:hover { transform: scale(1.1); }
`

const Hint = styled.p`
  font-size: 0.76rem;
  color: ${Color.text.muted};
  margin: 8px 0 0;
  line-height: 1.5;
`

const Notice = styled.div<{ $ok?: boolean }>`
  padding: 10px 14px;
  border-radius: ${Radius.sm}px;
  margin-bottom: 14px;
  font-size: 0.88rem;
  background: ${p => (p.$ok ? '#ecfdf5' : '#fef2f2')};
  color: ${p => (p.$ok ? '#059669' : '#dc2626')};
`

const LoadingBox = styled.div`
  padding: 60px;
  text-align: center;
  color: ${Color.text.muted};
`

const TEMPLATE_LABELS: Record<string, string> = {
  verify_code: '邮箱验证码',
  order_notice: '订单通知',
  reset_password: '密码重置',
}

// 公众号风格调色板：克制、邮件友好的配色
const PALETTE_COLORS = [
  '#1f2329', '#595959', '#8c8c8c', '#ffffff',
  '#1a56db', '#0ea5e9', '#059669', '#d97706',
  '#dc2626', '#db2777', '#7c3aed', '#0d9488',
]

type ViewMode = 'edit' | 'preview' | 'code'

const AdminEmailTemplates: React.FC = () => {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([])
  const [activeType, setActiveType] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [textBody, setTextBody] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<ViewMode>('edit')
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null)
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const load = () => {
    setLoading(true)
    adminAPI.getEmailTemplates()
      .then((res: any) => {
        const list: EmailTemplateItem[] = res.data || []
        setTemplates(list)
        if (list.length && !activeType) selectTemplate(list[0].template_type)
        setLoading(false)
      })
      .catch(() => { setLoading(false); setNotice({ msg: 'Failed to load email templates', ok: false }) })
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [])

  const selectTemplate = (type: string) => {
    const tpl = templates.find(x => x.template_type === type)
    if (!tpl) return
    setActiveType(type)
    setSubject(tpl.subject)
    setHtmlBody(tpl.html_body)
    setTextBody(tpl.text_body)
    setIsActive(tpl.is_active)
    setView('edit')
    // 等待渲染后写入画布
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = tpl.html_body || ''
    })
  }

  const syncFromCanvas = () => {
    if (editorRef.current) setHtmlBody(editorRef.current.innerHTML)
  }

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    syncFromCanvas()
  }

  const handleSave = async () => {
    if (!activeType) return
    setSaving(true)
    try {
      await adminAPI.updateEmailTemplate(activeType, {
        subject,
        html_body: htmlBody,
        text_body: textBody,
        is_active: isActive,
      })
      setNotice({ msg: `Saved "${TEMPLATE_LABELS[activeType] || activeType}"`, ok: true })
    } catch {
      setNotice({ msg: 'Save failed', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (type: string) => {
    try {
      await adminAPI.resetEmailTemplate(type)
      setNotice({ msg: 'Restored to default', ok: true })
      load()
    } catch {
      setNotice({ msg: 'Reset failed', ok: false })
    }
  }

  if (loading) return <LoadingBox>Loading...</LoadingBox>

  const activeLabel = activeType ? (TEMPLATE_LABELS[activeType] || activeType) : ''

  return (
    <Wrap>
      {/* 左：模板列表 */}
      <Sidebar>
        <SidebarTitle>{t('admin.emailTemplates.pickTemplate')}</SidebarTitle>
        {templates.map(tpl => (
          <TplItem
            key={tpl.template_type}
            $active={tpl.template_type === activeType}
            onClick={() => selectTemplate(tpl.template_type)}
          >
            {TEMPLATE_LABELS[tpl.template_type] || tpl.template_type}
          </TplItem>
        ))}
      </Sidebar>

      {/* 中：编辑区 */}
      <EditorCol>
        <TopBar>
          <Title>{activeLabel} · {t('admin.emailTemplates.editor')}</Title>
          <SegBtn $on={view === 'edit'} onClick={() => setView('edit')}>{t('admin.emailTemplates.editor')}</SegBtn>
          <SegBtn $on={view === 'preview'} onClick={() => setView('preview')}>{t('admin.emailTemplates.preview')}</SegBtn>
          <SegBtn $on={view === 'code'} onClick={() => setView('code')}>{t('admin.emailTemplates.code')}</SegBtn>
        </TopBar>
        {notice && <Notice $ok={notice.ok}>{notice.msg}</Notice>}
        <SubjectInput
          placeholder={t('admin.emailTemplates.subject')}
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />

        <CanvasCard>
          {view === 'edit' && (
            <>
              <PreviewLabel>✏️ {t('admin.emailTemplates.canvasHint')}</PreviewLabel>
              <Canvas
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncFromCanvas}
              />
            </>
          )}
          {view === 'preview' && (
            <>
              <PreviewLabel>📧 {t('admin.emailTemplates.previewFrame')}</PreviewLabel>
              <PreviewFrame title="preview" srcDoc={`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6">${htmlBody}</body></html>`} />
            </>
          )}
          {view === 'code' && (
            <CodeArea
              value={htmlBody}
              onChange={e => setHtmlBody(e.target.value)}
              spellCheck={false}
            />
          )}
        </CanvasCard>

        <BottomBar>
          <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Active
          </label>
          <div style={{ flex: 1 }} />
          <GhostBtn onClick={() => activeType && setResetTarget(activeType)}>
            {t('admin.emailTemplates.resetToDefault')}
          </GhostBtn>
          <SaveBtn onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </SaveBtn>
        </BottomBar>
        <Hint>{t('admin.emailTemplates.placeholderNote')}</Hint>
      </EditorCol>

      {/* 右：可视化调色板 / 排版工具 */}
      <Palette>
        <PaletteTitle>🎨 {t('admin.emailTemplates.palette')}</PaletteTitle>

        <Group>
          <GroupLabel>{t('admin.emailTemplates.typo')}</GroupLabel>
          <BtnRow>
            <ToolBtn onClick={() => exec('formatBlock', 'H1')}>{t('admin.emailTemplates.h1')}</ToolBtn>
            <ToolBtn onClick={() => exec('formatBlock', 'H2')}>{t('admin.emailTemplates.h2')}</ToolBtn>
            <ToolBtn onClick={() => exec('formatBlock', 'P')}>{t('admin.emailTemplates.para')}</ToolBtn>
          </BtnRow>
        </Group>

        <Group>
          <GroupLabel>{t('admin.emailTemplates.style')}</GroupLabel>
          <BtnRow>
            <ToolBtn onClick={() => exec('bold')}><b>B</b></ToolBtn>
            <ToolBtn onClick={() => exec('italic')}><i>I</i></ToolBtn>
            <ToolBtn onClick={() => exec('underline')}><u>U</u></ToolBtn>
          </BtnRow>
        </Group>

        <Group>
          <GroupLabel>{t('admin.emailTemplates.color')}</GroupLabel>
          <Swatches>
            {PALETTE_COLORS.map(c => (
              <Swatch key={c} $c={c} title={c} onClick={() => exec('foreColor', c)} />
            ))}
          </Swatches>
          <BtnRow style={{ marginTop: 8 }}>
            <input
              type="color"
              onChange={e => exec('foreColor', e.target.value)}
              style={{ width: 38, height: 34, border: 'none', background: 'none', cursor: 'pointer' }}
              title="自定义颜色"
            />
          </BtnRow>
        </Group>

        <Group>
          <GroupLabel>{t('admin.emailTemplates.align')}</GroupLabel>
          <BtnRow>
            <ToolBtn onClick={() => exec('justifyLeft')}>⇤ {t('admin.emailTemplates.alignLeft')}</ToolBtn>
            <ToolBtn onClick={() => exec('justifyCenter')}>↔ {t('admin.emailTemplates.alignCenter')}</ToolBtn>
            <ToolBtn onClick={() => exec('justifyRight')}>⇥ {t('admin.emailTemplates.alignRight')}</ToolBtn>
          </BtnRow>
        </Group>

        <Group>
          <GroupLabel>{t('admin.emailTemplates.insert')}</GroupLabel>
          <BtnRow>
            <ToolBtn onClick={() => {
              const url = window.prompt(t('admin.emailTemplates.imageUrlPrompt'))
              if (url) exec('insertImage', url)
            }}>{t('admin.emailTemplates.insertImage')}</ToolBtn>
            <ToolBtn onClick={() => {
              const txt = window.prompt(t('admin.emailTemplates.buttonTextPrompt'), '查看详情')
              if (!txt) return
              const url = window.prompt(t('admin.emailTemplates.buttonUrlPrompt'), 'https://shop.ziggner.com')
              if (!url) return
              exec('insertHTML',
                `<div style="text-align:center;margin:14px 0"><a class="btn" href="${url}" style="background:${Color.primary};color:#fff;padding:10px 26px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">${txt}</a></div>`)
            }}>{t('admin.emailTemplates.insertButton')}</ToolBtn>
            <ToolBtn onClick={() => exec('insertHorizontalRule')}>{t('admin.emailTemplates.insertDivider')}</ToolBtn>
            <ToolBtn onClick={() => exec('insertHTML', '<div style="height:16px"></div>')}>{t('admin.emailTemplates.insertSpacer')}</ToolBtn>
          </BtnRow>
        </Group>
      </Palette>

      {resetTarget !== null && (
        <ConfirmDialog
          open
          title={t('admin.emailTemplates.resetTitle')}
          message={t('admin.emailTemplates.confirmReset')}
          confirmLabel={t('admin.emailTemplates.resetToDefault')}
          cancelLabel={t('common.cancel')}
          tone="danger"
          onConfirm={() => { const type = resetTarget; setResetTarget(null); handleReset(type) }}
          onCancel={() => setResetTarget(null)}
        />
      )}
    </Wrap>
  )
}

export default AdminEmailTemplates
