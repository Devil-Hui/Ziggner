import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../i18n'
import { useUser } from '../../../store/UserContext'
import { chatAPI, type ConversationSummary, type ConversationDetail, type ChatMessage, mergeWsMessage } from '../../../api/chat'
import { CONFIG } from '../../../config/constants'
import { Color, Spacing, Radius, FontSize, Breakpoint, Shadow } from '../../../theme/tokens'

// 配色对齐 Profile 页（墨黑为主 + 红做点缀，无渐变）
const BRAND = {
  red: Color.primary,
  light: Color.primaryLight,
}

type WSStatus = 'connecting' | 'connected' | 'disconnected'

// ── Styled Components ──

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.lg}px;
`

const ChatShell = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  overflow: hidden;
  background: ${Color.bg.card};
  min-height: 480px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

// ── 会话列表 ──
const ConvList = styled.div`
  border-right: 1px solid ${Color.border.light};
  display: flex;
  flex-direction: column;
  background: ${Color.bg.sunken};

  @media (max-width: ${Breakpoint.mobile}px) {
    border-right: none;
    border-bottom: 1px solid ${Color.border.light};
    max-height: 220px;
  }
`

const ConvListHeader = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ConvListTitle = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.heading};
`

const NewConvBtn = styled.button`
  padding: 5px 12px;
  border-radius: ${Radius.sm}px;
  border: 1px solid ${BRAND.red};
  background: ${BRAND.red};
  color: ${Color.text.inverse};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${Color.primaryHover};
  }
`

const ConvItems = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`

const ConvItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: none;
  border-radius: ${Radius.md}px;
  background: ${({ $active }) => ($active ? BRAND.light : 'transparent')};
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.15s;

  &:hover {
    background: ${({ $active }) => ($active ? BRAND.light : Color.bg.card)};
  }
`

const ConvSubject = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.body};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ConvMeta = styled.div`
  font-size: 11px;
  color: ${Color.text.muted};
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const ConvStatusDot = styled.span<{ $open?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $open }) => ($open ? Color.status.success : Color.text.muted)};
  flex-shrink: 0;
`

const ConvEmpty = styled.div`
  text-align: center;
  padding: ${Spacing.xxl}px 0;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`

// ── 聊天窗口 ──
const ChatArea = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const ChatHeader = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const ChatTitle = styled.div`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${Color.text.heading};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ChatActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const WSIndicator = styled.span<{ $status: WSStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ $status }) =>
    $status === 'connected' ? Color.status.success
      : $status === 'connecting' ? Color.status.warning
        : Color.text.muted};

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $status }) =>
      $status === 'connected' ? Color.status.success
        : $status === 'connecting' ? Color.status.warning
          : Color.text.muted};
  }
`

const CloseBtn = styled.button`
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  border-radius: ${Radius.sm}px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${Color.status.error};
    color: ${Color.status.error};
  }
`

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 300px;
  max-height: 420px;
  background: ${Color.bg.page};
`

const MsgRow = styled.div<{ $mine?: boolean }>`
  display: flex;
  justify-content: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
`

const MsgBubble = styled.div<{ $mine?: boolean }>`
  max-width: 72%;
  padding: 9px 13px;
  border-radius: ${Radius.lg}px;
  font-size: ${FontSize.sm}px;
  line-height: 1.6;
  word-break: break-word;
  background: ${({ $mine }) => ($mine ? BRAND.red : Color.bg.card)};
  color: ${({ $mine }) => ($mine ? Color.text.inverse : Color.text.body)};
  border: ${({ $mine }) => ($mine ? 'none' : `1px solid ${Color.border.light}`)};
`

const MsgTime = styled.div`
  font-size: 10px;
  color: ${Color.text.muted};
  margin-top: 4px;
  text-align: right;
`

const MsgEmpty = styled.div`
  text-align: center;
  padding: ${Spacing.xxl}px 0;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`

// ── 输入区 ──
const InputBar = styled.div`
  border-top: 1px solid ${Color.border.light};
  padding: 12px 16px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
`

const Input = styled.textarea`
  flex: 1;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  padding: 9px 12px;
  font-size: ${FontSize.sm}px;
  font-family: inherit;
  resize: none;
  min-height: 40px;
  max-height: 100px;
  outline: none;
  background: ${Color.bg.card};
  color: ${Color.text.body};
  transition: border-color 0.15s;

  &:focus {
    border-color: ${BRAND.red};
  }
`

const SendBtn = styled.button`
  padding: 9px 18px;
  border-radius: ${Radius.md}px;
  border: none;
  background: ${BRAND.red};
  color: ${Color.text.inverse};
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: ${Color.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// ── 新建对话表单 ──
const NewConvForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  background: ${Color.bg.card};
`

const FormLabel = styled.label`
  font-size: 12px;
  color: ${Color.text.secondary};
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const FormInput = styled.input`
  height: 38px;
  padding: 0 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  outline: none;

  &:focus {
    border-color: ${BRAND.red};
  }
`

const FormTextarea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.sm}px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  outline: none;

  &:focus {
    border-color: ${BRAND.red};
  }
`

const FormActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`

const FormBtn = styled.button<{ $primary?: boolean }>`
  padding: 8px 18px;
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${({ $primary }) => ($primary ? BRAND.red : Color.border.medium)};
  background: ${({ $primary }) => ($primary ? BRAND.red : Color.bg.card)};
  color: ${({ $primary }) => ($primary ? Color.text.inverse : Color.text.secondary)};
  transition: all 0.15s;

  &:hover {
    background: ${({ $primary }) => ($primary ? Color.primaryHover : Color.bg.sunken)};
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${Spacing.xxxl}px 0;
  color: ${Color.text.muted};
  font-size: ${FontSize.base}px;
`

// ── 工具函数 ──
function formatTime(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatListTime(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ── WebSocket hook ──
function useChatSocket(
  convId: number | null,
  onMessage: (data: Record<string, unknown>) => void,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const [wsStatus, setWsStatus] = useState<WSStatus>('disconnected')
  const reconnectRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!convId) return
    setWsStatus('connecting')
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const configured = (import.meta.env.VITE_WS_URL || '').replace(/\/+$/, '')
    const wsBase = configured || `${scheme}://${window.location.host}`
    const wsUrl = `${wsBase}/ws/chat/${convId}/`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onopen = () => {
        setWsStatus('connected')
        reconnectRef.current = 0
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
            return
          }
          onMessage(data)
        } catch {
          // ignore
        }
      }
      ws.onclose = () => {
        setWsStatus('disconnected')
        wsRef.current = null
        if (reconnectRef.current < CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            CONFIG.WS_RECONNECT_BASE_DELAY * Math.pow(2, reconnectRef.current),
            CONFIG.WS_RECONNECT_MAX_DELAY,
          )
          reconnectRef.current++
          timerRef.current = setTimeout(connect, delay)
        }
      }
      ws.onerror = () => { /* onclose fires after */ }
    } catch {
      setWsStatus('disconnected')
    }
  }, [convId, onMessage])

  const disconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    reconnectRef.current = CONFIG.WS_MAX_RECONNECT_ATTEMPTS
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setWsStatus('disconnected')
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { wsStatus }
}

export default function SupportPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [inputText, setInputText] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newContent, setNewContent] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchConversations = useCallback(async () => {
    if (!isLoggedIn) return
    setLoading(true)
    try {
      const data = await chatAPI.getConversations()
      setConversations(Array.isArray(data) ? data : [])
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  const openConversation = useCallback(async (id: number) => {
    setActiveId(id)
    setShowNewForm(false)
    try {
      const detail = await chatAPI.getMessages(id)
      setActiveConv(detail)
    } catch {
      setActiveConv(null)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const onWsMessage = useCallback(
    (data: Record<string, unknown>) => {
      const kind = data.kind === 'read_receipt' ? 'read_receipt' : 'message'
      setActiveConv((prev) => mergeWsMessage(prev, data, 'user', kind))
    },
    [],
  )

  const { wsStatus } = useChatSocket(activeId, onWsMessage)

  const send = async () => {
    const content = inputText.trim()
    if (!content || !activeId || sending) return
    setSending(true)
    const optimistic: ChatMessage = {
      id: -Date.now(),
      sender: 'me',
      sender_type: 'user',
      sender_name: '',
      content,
      msg_type: 'text',
      file_url: null,
      card_data: null,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      status: 'sending',
    }
    setActiveConv((prev) => (prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev))
    setInputText('')
    try {
      const real = await chatAPI.sendMessage(activeId, { content })
      setActiveConv((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) => (m.id === optimistic.id ? { ...real, status: 'sent' } : m)),
            }
          : prev,
      )
    } catch {
      setActiveConv((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === optimistic.id ? { ...m, status: 'sent' } : m,
              ),
            }
          : prev,
      )
    } finally {
      setSending(false)
    }
  }

  const createConversation = async () => {
    if (!isLoggedIn) {
      const returnPath = window.location.pathname + window.location.search
      navigate('/auth?tab=login&redirect=' + encodeURIComponent(returnPath))
      return
    }
    setCreating(true)
    try {
      const detail = await chatAPI.createConversation({
        subject: newSubject.trim() || t('store.support.newConversationDefault'),
        content: newContent.trim() || undefined,
      })
      setShowNewForm(false)
      setNewSubject('')
      setNewContent('')
      await fetchConversations()
      setActiveConv(detail)
      setActiveId(detail.id)
    } catch {
      // 创建失败静默
    } finally {
      setCreating(false)
    }
  }

  const closeConversation = async () => {
    if (!activeId) return
    try {
      await chatAPI.closeConversation(activeId)
      await fetchConversations()
      setActiveConv(null)
      setActiveId(null)
    } catch {
      // 关闭失败静默
    }
  }

  if (!isLoggedIn) {
    return (
      <Panel>
        <EmptyState>{t('store.profile.loginRequired')}</EmptyState>
      </Panel>
    )
  }

  return (
    <Panel>
      {showNewForm && (
        <NewConvForm>
          <FormLabel>
            {t('store.support.subjectPlaceholder')}
            <FormInput
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder={t('store.support.subjectPlaceholder')}
            />
          </FormLabel>
          <FormLabel>
            {t('store.support.contentPlaceholder')}
            <FormTextarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t('store.support.contentPlaceholder')}
            />
          </FormLabel>
          <FormActions>
            <FormBtn onClick={() => setShowNewForm(false)}>{t('store.support.cancel')}</FormBtn>
            <FormBtn $primary disabled={creating} onClick={createConversation}>
              {creating ? t('store.support.sending') : t('store.support.startNewConversation')}
            </FormBtn>
          </FormActions>
        </NewConvForm>
      )}

      <ChatShell>
        <ConvList>
          <ConvListHeader>
            <ConvListTitle>{t('store.support.title')}</ConvListTitle>
            <NewConvBtn onClick={() => setShowNewForm((v) => !v)}>
              {t('store.support.newButton')}
            </NewConvBtn>
          </ConvListHeader>
          <ConvItems>
            {loading ? (
              <ConvEmpty>{t('store.support.loading')}</ConvEmpty>
            ) : conversations.length === 0 ? (
              <ConvEmpty>{t('store.support.noConversations')}</ConvEmpty>
            ) : (
              conversations.map((c) => (
                <ConvItem key={c.id} $active={activeId === c.id} onClick={() => openConversation(c.id)}>
                  <ConvSubject>{c.subject || `${t('store.support.conversation')} #${c.id}`}</ConvSubject>
                  <ConvMeta>
                    <ConvStatusDot $open={c.status === 'open'} />
                    {c.status === 'open' ? t('store.chat.statusPending') : t('store.chat.statusClosed')}
                    {c.last_message && ` · ${formatListTime(c.last_message.created_at)}`}
                  </ConvMeta>
                </ConvItem>
              ))
            )}
          </ConvItems>
        </ConvList>

        <ChatArea>
          {activeConv ? (
            <>
              <ChatHeader>
                <ChatTitle>
                  {activeConv.subject || `${t('store.support.conversation')} #${activeConv.id}`}
                </ChatTitle>
                <ChatActions>
                  <WSIndicator $status={wsStatus}>
                    {wsStatus === 'connected'
                      ? t('store.chat.live')
                      : wsStatus === 'connecting'
                        ? t('store.chat.connecting')
                        : t('store.chat.offline')}
                  </WSIndicator>
                  {activeConv.status === 'open' && (
                    <CloseBtn onClick={closeConversation}>{t('store.support.closeConversation')}</CloseBtn>
                  )}
                </ChatActions>
              </ChatHeader>
              <Messages>
                {activeConv.messages.length === 0 ? (
                  <MsgEmpty>{t('store.support.noMessages')}</MsgEmpty>
                ) : (
                  activeConv.messages.map((m) => (
                    <MsgRow key={m.id} $mine={m.sender_type === 'user'}>
                      <div>
                        <MsgBubble $mine={m.sender_type === 'user'}>{m.content}</MsgBubble>
                        <MsgTime>{formatTime(m.created_at)}</MsgTime>
                      </div>
                    </MsgRow>
                  ))
                )}
              </Messages>
              {activeConv.status === 'open' ? (
                <InputBar>
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    placeholder={t('store.support.messagePlaceholder')}
                  />
                  <SendBtn disabled={!inputText.trim() || sending} onClick={send}>
                    {sending ? t('store.support.sending') : t('store.support.send')}
                  </SendBtn>
                </InputBar>
              ) : (
                <EmptyState>{t('store.support.conversationClosed')}</EmptyState>
              )}
            </>
          ) : (
            <EmptyState>{t('store.support.selectConversation')}</EmptyState>
          )}
        </ChatArea>
      </ChatShell>
    </Panel>
  )
}