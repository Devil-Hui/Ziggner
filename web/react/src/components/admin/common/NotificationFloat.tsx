import { useState, useEffect, useRef } from 'react'
import { get, post } from '../../../api/request'
import { useTranslation } from '../../../i18n'
import { Icon } from './Icon'
import { CONFIG } from '../../../config/constants'

interface NotifItem {
  id: number; title: string; content: string; is_read: boolean; created_at: string; type: string
}

export default function NotificationFloat() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifs = () => {
    get<any>('/notification/', { params: { page_size: CONFIG.NOTIF_FLOAT_PAGE_SIZE } }).then((res: any) => {
      setNotifs(res?.results || [])
    }).catch(() => {})
  }

  useEffect(() => { fetchNotifs(); const timer = setInterval(fetchNotifs, CONFIG.NOTIF_FLOAT_POLL_INTERVAL); return () => clearInterval(timer) }, [])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifs.filter(n => !n.is_read).length

  const markRead = (id: number) => {
    post(`/notification/${id}/read/`, {}).then(() => fetchNotifs()).catch(() => {})
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '8px 4px', display: 'flex', alignItems: 'center' }}>
        <Icon name="bell" size={18} />
        {unread > 0 && <span style={{ position: 'absolute', top: 0, right: -4, background: '#e74c3c', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 40, width: 340, maxHeight: 400, background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'auto', zIndex: 10000 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', fontWeight: 600, fontSize: 14 }}>{t('admin.sidebar.notifications')}</div>
          {notifs.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>{t('notification.empty')}</div>}
          {notifs.map(n => (
            <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', opacity: n.is_read ? 0.6 : 1 }}>
              <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{n.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
