import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import Button from '../../components/common/Button/Button'
import { useUser } from '../../store/UserContext'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, Spacing } from '../../theme/tokens'
import {
  supportAPI,
  type SupportConversation,
  type SupportConversationSummary,
  type SupportMessage,
  type CreateConversationParams,
} from '../../api/support'

// ── Styled Components ──

const Container = styled.div`
  min-height: 100vh;
  background: ${Color.bg.page};
  padding: 30px 5vw;
`

const Wrapper = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
  height: calc(100vh - 160px);
`

const Sidebar = styled.div`
  width: 280px;
  min-width: 280px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SidebarTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
`

const ConvList = styled.div`
  flex: 1;
  overflow-y: auto;
`

const ConvItem = styled.div<{ $active?: boolean }>`
  padding: 14px 16px;
  border-bottom: 1px solid ${Color.border.light};
  cursor: pointer;
  background: ${props => props.$active ? '#f5f5f5' : 'transparent'};
  transition: background 0.15s;

  &:hover {
    background: #f9f9f9;
  }
`

const ConvSubject = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #222;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ConvLastMsg = styled.div`
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
`

const ConvBadge = styled.span`
  background: #ff4646;
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
`

const StatusDot = styled.span<{ $status: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => props.$status === 'open' ? '#4caf50' : '#999'};
  display: inline-block;
`

const ChatArea = styled.div`
  flex: 1;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ChatHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ChatTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
`

const ChatHeaderActions = styled.div`
  display: flex;
  gap: 8px;
`

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const MessageBubble = styled.div<{ $from: 'user' | 'admin' | 'system' }>`
  max-width: 70%;
  ${props => {
    if (props.$from === 'system') {
      return `
        align-self: center;
        background: #f0f0f0;
        color: #999;
        padding: 6px 16px;
        border-radius: 12px;
        font-size: 12px;
      `
    }
    if (props.$from === 'user') {
      return `
        align-self: flex-end;
        background: ${Color.primaryHover};
        color: #fff;
        padding: 10px 16px;
        border-radius: 16px 16px 4px 16px;
        font-size: 14px;
      `
    }
    return `
      align-self: flex-start;
      background: #f0f0f0;
      color: #333;
      padding: 10px 16px;
      border-radius: 16px 16px 16px 4px;
      font-size: 14px;
    `
  }}
  line-height: 1.5;
  word-break: break-word;
`

const MsgTime = styled.div<{ $from: 'user' | 'admin' }>`
  font-size: 11px;
  color: #bbb;
  margin-top: 4px;
  text-align: ${props => props.$from === 'user' ? 'right' : 'left'};
`

const MsgAttachments = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`

const AttachmentImg = styled.img`
  max-width: 200px;
  max-height: 150px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: cover;
`

const AttachmentVideo = styled.video`
  max-width: 200px;
  max-height: 150px;
  border-radius: 8px;
`

const ProductCard = styled.div`
  display: flex;
  gap: 10px;
  padding: 8px;
  background: #fff;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  margin-top: 8px;
  cursor: pointer;
  max-width: 260px;

  &:hover {
    border-color: ${Color.primary};
  }
`

const ProductCardImg = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 4px;
  object-fit: cover;
`

const ProductCardInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const ProductCardName = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ProductCardPrice = styled.div`
  font-size: 14px;
  color: #ff4646;
  font-weight: 600;
  margin-top: 4px;
`

const InputArea = styled.div`
  padding: 16px;
  border-top: 1px solid ${Color.border.light};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`

const TextInput = styled.textarea`
  flex: 1;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
  height: 44px;
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: ${Color.primary};
  }
`

const ToolBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const ToolBtn = styled.button`
  background: none;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;

  &:hover {
    background: #f5f5f5;
    color: #333;
  }
`

const HiddenInput = styled.input`
  display: none;
`

const SendBtn = styled.button`
  background: ${Color.primaryHover};
  color: #fff;
  border: none;
  border-radius: ${Radius.sm}px;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  gap: 16px;
`

const EmptyIcon = styled.div`
  font-size: 48px;
  opacity: 0.3;
`

const EmptyText = styled.div`
  font-size: 15px;
`

const NewConvSection = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${Color.border.light};
`

const NewConvForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SubjectInput = styled.input`
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: ${Color.primary};
  }
`

const PreviewRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PreviewItem = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid ${Color.border.medium};
`

const PreviewImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const PreviewRemove = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
`

const LoadingMore = styled.div`
  text-align: center;
  padding: 12px;
  color: #999;
  font-size: 13px;
`

// ── Component ──

export default function Support() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoggedIn } = useUser()
  const { t, lang } = useTranslation()
  const isZh = lang === 'zh-CN'

  const [conversations, setConversations] = useState<SupportConversationSummary[]>([])
  const [activeConv, setActiveConv] = useState<SupportConversation | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [convLoading, setConvLoading] = useState(false)

  // New conversation
  const [showNewConv, setShowNewConv] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newAttachments, setNewAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Send message
  const [inputText, setInputText] = useState('')
  const [inputAttachments, setInputAttachments] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  const msgListRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newFileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pre-fill from URL params
  const spuId = searchParams.get('spu_id') || undefined
  const spuName = searchParams.get('spu_name') || undefined
  const spuImage = searchParams.get('spu_image') || undefined
  const spuPrice = searchParams.get('spu_price') || undefined

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth?tab=login')
    }
  }, [isLoggedIn, navigate])

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      const list = await supportAPI.listConversations()
      setConversations(list)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      loadConversations()
    }
  }, [isLoggedIn, loadConversations])

  // Load conversation detail
  const loadConversation = useCallback(async (convId: number) => {
    try {
      setConvLoading(true)
      const detail = await supportAPI.getConversation(convId)
      setActiveConv(detail)
      setActiveId(convId)
    } catch {
      // ignore
    } finally {
      setConvLoading(false)
    }
  }, [])

  // Poll for new messages
  useEffect(() => {
    if (activeId) {
      pollRef.current = setInterval(() => {
        loadConversation(activeId)
      }, 5000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [activeId, loadConversation])

  // Auto scroll to bottom
  useEffect(() => {
    if (msgListRef.current) {
      msgListRef.current.scrollTop = msgListRef.current.scrollHeight
    }
  }, [activeConv?.messages])

  // Auto-fill product info from URL params
  useEffect(() => {
    if (spuId && spuName) {
      setNewSubject(isZh ? `咨询商品：${spuName}` : `Product inquiry: ${spuName}`)
      setShowNewConv(true)
    }
  }, [spuId, spuName, isZh])

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      for (const file of Array.from(files)) {
        const result = await supportAPI.uploadAttachment(file)
        if (isNew) {
          setNewAttachments(prev => [...prev, result.url])
        } else {
          setInputAttachments(prev => [...prev, result.url])
        }
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  // Create new conversation
  const handleCreateConversation = async () => {
    if (!newContent.trim() && newAttachments.length === 0) return

    try {
      setSending(true)
      const params: CreateConversationParams = {
        subject: newSubject || (isZh ? '新对话' : 'New conversation'),
        content: newContent,
        attachments: newAttachments,
      }

      if (spuId && spuName && spuImage) {
        params.spu_id = parseInt(spuId)
        params.product_snapshot = {
          id: parseInt(spuId),
          name: spuName,
          main_image: spuImage,
          price: spuPrice || '0',
        }
      }

      const conv = await supportAPI.createConversation(params)
      setActiveConv(conv)
      setActiveId(conv.id)
      setShowNewConv(false)
      setNewSubject('')
      setNewContent('')
      setNewAttachments([])
      await loadConversations()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  // Send message
  const handleSend = async () => {
    if (!activeId) return
    if (!inputText.trim() && inputAttachments.length === 0) return

    const text = inputText
    const atts = inputAttachments
    setInputText('')
    setInputAttachments([])

    try {
      setSending(true)
      await supportAPI.sendMessage(activeId, {
        content: text,
        attachments: atts,
      })
      await loadConversation(activeId)
      await loadConversations()
    } catch {
      setInputText(text)
      setInputAttachments(atts)
    } finally {
      setSending(false)
    }
  }

  // Close conversation
  const handleClose = async () => {
    if (!activeId) return
    try {
      await supportAPI.closeConversation(activeId)
      await loadConversation(activeId)
      await loadConversations()
    } catch {
      // ignore
    }
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showNewConv) {
        handleCreateConversation()
      } else {
        handleSend()
      }
    }
  }

  const formatTime = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return time
    return `${date.getMonth() + 1}/${date.getDate()} ${time}`
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

  const renderAttachments = (attachments: string[]) => (
    <MsgAttachments>
      {attachments.map((url, i) => {
        if (isImage(url)) {
          return <AttachmentImg key={i} src={url} alt="" onClick={() => window.open(url)} />
        }
        if (isVideo(url)) {
          return <AttachmentVideo key={i} src={url} controls />
        }
        return null
      })}
    </MsgAttachments>
  )

  const renderProductCard = (snapshot: SupportMessage['product_snapshot']) => {
    if (!snapshot) return null
    return (
      <ProductCard onClick={() => navigate(`/product/${snapshot.id}`)}>
        <ProductCardImg src={snapshot.main_image} alt={snapshot.name} />
        <ProductCardInfo>
          <ProductCardName>{snapshot.name}</ProductCardName>
          <ProductCardPrice>¥{snapshot.price}</ProductCardPrice>
        </ProductCardInfo>
      </ProductCard>
    )
  }

  const renderMessage = (msg: SupportMessage) => {
    const from = msg.is_system ? 'system' : (msg.sender as 'user' | 'admin')
    return (
      <div key={msg.id}>
        <MessageBubble $from={from}>
          {msg.content}
          {msg.attachments && msg.attachments.length > 0 && renderAttachments(msg.attachments)}
          {msg.product_snapshot && renderProductCard(msg.product_snapshot)}
        </MessageBubble>
        {from !== 'system' && (
          <MsgTime $from={from}>{formatTime(msg.created_at)}</MsgTime>
        )}
      </div>
    )
  }

  if (!isLoggedIn) return null

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader>
              <SidebarTitle>{isZh ? '客服消息' : 'Support'}</SidebarTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewConv(true)}
              >
                {isZh ? '+ 新对话' : '+ New'}
              </Button>
            </SidebarHeader>

            <ConvList>
              {showNewConv && (
                <NewConvSection>
                  <NewConvForm>
                    <SubjectInput
                      placeholder={isZh ? '对话主题（可选）' : 'Subject (optional)'}
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                    />
                    <TextInput
                      placeholder={isZh ? '描述您的问题...' : 'Describe your issue...'}
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{ height: 60 }}
                    />
                    {newAttachments.length > 0 && (
                      <PreviewRow>
                        {newAttachments.map((url, i) => (
                          <PreviewItem key={i}>
                            <PreviewImg src={url} alt="" />
                            <PreviewRemove onClick={() => setNewAttachments(prev => prev.filter((_, j) => j !== i))}>
                              x
                            </PreviewRemove>
                          </PreviewItem>
                        ))}
                      </PreviewRow>
                    )}
                    <ToolBar>
                      <ToolBtn onClick={() => newFileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? (isZh ? '上传中...' : 'Uploading...') : (isZh ? '图片/视频' : 'Image/Video')}
                      </ToolBtn>
                      <HiddenInput
                        ref={newFileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={e => handleUpload(e, true)}
                      />
                      <div style={{ flex: 1 }} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewConv(false)
                          setNewSubject('')
                          setNewContent('')
                          setNewAttachments([])
                        }}
                      >
                        {isZh ? '取消' : 'Cancel'}
                      </Button>
                      <SendBtn
                        onClick={handleCreateConversation}
                        disabled={sending || (!newContent.trim() && newAttachments.length === 0)}
                      >
                        {sending ? (isZh ? '发送中...' : 'Sending...') : (isZh ? '发送' : 'Send')}
                      </SendBtn>
                    </ToolBar>
                  </NewConvForm>
                </NewConvSection>
              )}

              {loading && conversations.length === 0 && (
                <LoadingMore>{isZh ? '加载中...' : 'Loading...'}</LoadingMore>
              )}

              {!loading && conversations.length === 0 && !showNewConv && (
                <EmptyState>
                  <EmptyIcon>&#x1F4AC;</EmptyIcon>
                  <EmptyText>{isZh ? '暂无对话' : 'No conversations'}</EmptyText>
                </EmptyState>
              )}

              {conversations.map(conv => (
                <ConvItem
                  key={conv.id}
                  $active={activeId === conv.id}
                  onClick={() => {
                    setActiveId(conv.id)
                    loadConversation(conv.id)
                  }}
                >
                  <ConvSubject>
                    <StatusDot $status={conv.status} />{' '}
                    {conv.subject || `${isZh ? '对话' : 'Conversation'} #${conv.id}`}
                  </ConvSubject>
                  <ConvLastMsg>
                    {conv.last_message ? (
                      <>
                        <span>{conv.last_message.content.slice(0, 40)}</span>
                        {conv.unread_count > 0 && <ConvBadge>{conv.unread_count}</ConvBadge>}
                      </>
                    ) : (
                      <span>{isZh ? '暂无消息' : 'No messages'}</span>
                    )}
                  </ConvLastMsg>
                </ConvItem>
              ))}
            </ConvList>
          </Sidebar>

          {/* Chat Area */}
          <ChatArea>
            {activeConv && activeId ? (
              <>
                <ChatHeader>
                  <ChatTitle>{activeConv.subject || `${isZh ? '对话' : 'Conversation'} #${activeConv.id}`}</ChatTitle>
                  <ChatHeaderActions>
                    {activeConv.spu_info && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/product/${activeConv.spu_info!.id}`)}>
                        {isZh ? '查看商品' : 'View Product'}
                      </Button>
                    )}
                    {activeConv.status === 'open' && (
                      <Button variant="ghost" size="sm" onClick={handleClose}>
                        {isZh ? '关闭对话' : 'Close'}
                      </Button>
                    )}
                  </ChatHeaderActions>
                </ChatHeader>

                <MessageList ref={msgListRef}>
                  {convLoading && (
                    <LoadingMore>{isZh ? '加载中...' : 'Loading...'}</LoadingMore>
                  )}
                  {activeConv.messages.map(renderMessage)}
                  {activeConv.status === 'closed' && (
                    <MessageBubble $from="system">
                      {isZh ? '对话已关闭' : 'Conversation closed'}
                    </MessageBubble>
                  )}
                </MessageList>

                {activeConv.status === 'open' && (
                  <InputArea>
                    {inputAttachments.length > 0 && (
                      <PreviewRow>
                        {inputAttachments.map((url, i) => (
                          <PreviewItem key={i}>
                            <PreviewImg src={url} alt="" />
                            <PreviewRemove onClick={() => setInputAttachments(prev => prev.filter((_, j) => j !== i))}>
                              x
                            </PreviewRemove>
                          </PreviewItem>
                        ))}
                      </PreviewRow>
                    )}
                    <InputRow>
                      <TextInput
                        placeholder={isZh ? '输入消息...' : 'Type a message...'}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <SendBtn
                        onClick={handleSend}
                        disabled={sending || (!inputText.trim() && inputAttachments.length === 0)}
                      >
                        {sending ? (isZh ? '发送中...' : 'Sending...') : (isZh ? '发送' : 'Send')}
                      </SendBtn>
                    </InputRow>
                    <ToolBar>
                      <ToolBtn onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? (isZh ? '上传中...' : 'Uploading...') : (isZh ? '图片/视频' : 'Image/Video')}
                      </ToolBtn>
                      <HiddenInput
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={e => handleUpload(e, false)}
                      />
                    </ToolBar>
                  </InputArea>
                )}
              </>
            ) : (
              <EmptyState>
                <EmptyIcon>&#x1F4AC;</EmptyIcon>
                <EmptyText>
                  {isZh ? '选择一个对话开始聊天，或创建新对话' : 'Select a conversation or start a new one'}
                </EmptyText>
                <Button variant="outline" onClick={() => setShowNewConv(true)}>
                  {isZh ? '创建新对话' : 'New Conversation'}
                </Button>
              </EmptyState>
            )}
          </ChatArea>
        </Wrapper>
      </Container>
    </PageLayout>
  )
}