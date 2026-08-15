import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminChatAPI, ConversationSummary } from '../../../api/chat'
import { useTranslation } from '../../../i18n'
import { Icon } from './Icon'
import { CONFIG } from '../../../config/constants'

export default function ChatFloatWidget() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [convs, setConvs] = useState<ConversationSummary[]>([])
  const [unread, setUnread] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    adminChatAPI.getConversations({ page_size: CONFIG.CHAT_FLOAT_PAGE_SIZE }).then((res: any) => {
      const list = res?.results || res || []
      setConvs(list.slice(0, CONFIG.CHAT_FLOAT_DISPLAY_MAX))
      setUnread(list.filter((c: any) => c.unread_count > 0).length)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 9999 }}>
      {open && (
        <div style={{
          position: 'absolute', right: 0, bottom: 60, width: 360, height: 480,
          background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 600, fontSize: 15 }}>
            {t('admin.layout.menu.chat')}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {convs.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>{t('store.support.noConversations')}</div>}
            {convs.map(c => (
              <div key={c.id} onClick={() => navigate(`/admin/chat/${c.id}`)}
                style={{ padding: '10px 12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#333' }}>{c.subject || c.user?.username || `#${c.id}`}</span>
                {c.unread_count > 0 && <span style={{ background: '#e74c3c', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 12 }}>{c.unread_count}</span>}
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <button onClick={() => navigate('/admin/chat')} style={{ border: 'none', background: 'none', color: '#1a56db', cursor: 'pointer', fontSize: 13 }}>{t('store.profile.viewAll')}</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        style={{
          width: 52, height: 52, borderRadius: '50%', background: '#1a56db', color: '#fff',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,86,219,0.4)',
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <Icon name="message-circle" size={24} />
        {unread > 0 && <span style={{
          position: 'absolute', top: -4, right: -4, background: '#e74c3c', color: '#fff',
          borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 600,
        }}>{unread > 99 ? '99+' : unread}</span>}
      </button>
    </div>
  )
}
