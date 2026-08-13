import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from '../../i18n'
import { adminAPI, type EmailTemplateItem } from '../../api/admin'
import { Color, Radius, Shadow, FontSize, Spacing } from '../../theme/tokens'
import { Input, PrimaryBtn as SaveBtn } from '../../components/admin/common/ui'

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
`

const Card = styled.div`
  background: #fff;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: ${Shadow.card};
`

const CardTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 4px;
`

const CardDesc = styled.p`
  font-size: 0.85rem;
  color: ${Color.text.secondary};
  margin: 0 0 16px;
`

const Field = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${Color.text.heading};
`

const Textarea = styled.textarea`
  width: 100%;
  min-height: 180px;
  padding: 10px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: 0.85rem;
  font-family: 'SFMono-Regular', Consolas, monospace;
  box-sizing: border-box;
  line-height: 1.5;
  resize: vertical;
  &:focus { outline: none; border-color: ${Color.primary}; box-shadow: 0 0 0 3px rgba(26,86,219,0.15); }
`

const Row = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`

const ResetBtn = styled.button`
  padding: 8px 16px;
  background: transparent;
  color: ${Color.text.secondary};
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: 0.9rem;
  cursor: pointer;
  &:hover { color: ${Color.status.error}; border-color: ${Color.status.error}; }
`

const Hint = styled.p`
  font-size: 0.8rem;
  color: ${Color.text.muted};
  margin-top: 4px;
`

const Notice = styled.div<{ $ok?: boolean }>`
  padding: 10px 14px;
  border-radius: ${Radius.sm}px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  background: ${p => p.$ok ? '#ecfdf5' : '#fef2f2'};
  color: ${p => p.$ok ? '#059669' : '#dc2626'};
`

const TEMPLATE_LABELS: Record<string, string> = {
  verify_code: '邮箱验证码',
  order_notice: '订单通知',
  reset_password: '密码重置',
}

const AdminEmailTemplates: React.FC = () => {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    adminAPI.getEmailTemplates()
      .then((res: any) => {
        setTemplates(res.data || [])
        setLoading(false)
      })
      .catch(() => { setLoading(false); setNotice({ msg: 'Failed to load email templates', ok: false }) })
  }, [])

  const updateField = (type: string, field: keyof EmailTemplateItem, value: string | boolean) => {
    setTemplates(prev => prev.map(t => t.template_type === type ? { ...t, [field]: value } : t))
  }

  const handleSave = async (tpl: EmailTemplateItem) => {
    setSaving(tpl.template_type)
    try {
      await adminAPI.updateEmailTemplate(tpl.template_type, {
        subject: tpl.subject,
        html_body: tpl.html_body,
        text_body: tpl.text_body,
        is_active: tpl.is_active,
      })
      setNotice({ msg: `Saved "${TEMPLATE_LABELS[tpl.template_type] || tpl.template_type}"`, ok: true })
    } catch {
      setNotice({ msg: 'Save failed', ok: false })
    } finally {
      setSaving(null)
    }
  }

  const handleReset = async (type: string) => {
    if (!window.confirm('Restore this template to default? Customizations will be lost.')) return
    try {
      await adminAPI.resetEmailTemplate(type)
      const res: any = await adminAPI.getEmailTemplates()
      setTemplates(res.data || [])
      setNotice({ msg: 'Restored to default', ok: true })
    } catch {
      setNotice({ msg: 'Reset failed', ok: false })
    }
  }

  if (loading) return <Container>Loading...</Container>

  return (
    <Container>
      <Header>
        <Title>{t('admin.layout.menu.emailTemplates')}</Title>
      </Header>
      {notice && <Notice $ok={notice.ok}>{notice.msg}</Notice>}
      <p style={{ fontSize: '0.85rem', color: Color.text.secondary, marginTop: 0 }}>
        Available placeholder: <code>{'{code}'}</code> — replaced with the actual verification code when sending.
      </p>
      {templates.map(tpl => (
        <Card key={tpl.template_type}>
          <CardTitle>{TEMPLATE_LABELS[tpl.template_type] || tpl.template_type}</CardTitle>
          <CardDesc>Type: {tpl.template_type}</CardDesc>
          <Field>
            <Label>Subject</Label>
            <Input
              value={tpl.subject}
              onChange={e => updateField(tpl.template_type, 'subject', e.target.value)}
            />
          </Field>
          <Field>
            <Label>HTML Body</Label>
            <Textarea
              value={tpl.html_body}
              onChange={e => updateField(tpl.template_type, 'html_body', e.target.value)}
            />
            <Hint>Use {`{code}`} placeholder for the verification code.</Hint>
          </Field>
          <Field>
            <Label>Plain Text Body</Label>
            <Textarea
              value={tpl.text_body}
              onChange={e => updateField(tpl.template_type, 'text_body', e.target.value)}
              style={{ minHeight: '60px' }}
            />
          </Field>
          <Row>
            <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={tpl.is_active}
                onChange={e => updateField(tpl.template_type, 'is_active', e.target.checked)}
              />
              Active
            </label>
            <div style={{ flex: 1 }} />
            <ResetBtn onClick={() => handleReset(tpl.template_type)}>Reset to Default</ResetBtn>
            <SaveBtn onClick={() => handleSave(tpl)} disabled={saving === tpl.template_type}>
              {saving === tpl.template_type ? 'Saving...' : 'Save'}
            </SaveBtn>
          </Row>
        </Card>
      ))}
    </Container>
  )
}

export default AdminEmailTemplates