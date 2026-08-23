// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import PageHeader from '../../components/admin/common/PageHeader';
import LoadingSkeleton from '../../components/admin/common/LoadingSkeleton';
import ErrorRetry from '../../components/admin/common/ErrorRetry';
import { StatusBadge, type StatusBadgeProps } from '../../components/admin/design-system';
import { StepBar, StepNode } from '../../components/admin/common';
import { adminAPI } from '../../api/admin';
import { adminChatAPI, resolveMediaUrl, type ConversationSummary } from '../../api/chat';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTranslation } from '../../i18n';
import { formatDateTime } from '../../utils/helpers';
import { SuccessBtn as ApproveBtn, DangerBtn as RejectBtn } from '../../components/admin/common/ui';
import ChatLink from '../../components/admin/ChatLink';

interface SPUDetail {
  id: number;
  name: string;
  brand_name: string;
  category_path: string;
  main_image: string;
  description: string;
  status: string;
  submitted_by_name?: string;
  submitted_at?: string;
  skus?: Array<{
    id: number;
    spec_values: Record<string, string>;
    price: number;
    discount_price: number | null;
    stock: number;
    shelf_status: string;
  }>;
  tags?: Array<{ id: number; name: string }>;
}

type Tone = NonNullable<StatusBadgeProps['tone']>

// SPU 状态 → semantic tone（业务只声明 tone，颜色由 design-system 解析）
function spuStatusMeta(status: string): { tone: Tone; label: string } {
  switch (status) {
    case 'draft': return { tone: 'neutral', label: '草稿' }
    case 'submitted': return { tone: 'warning', label: '待审核' }
    case 'approved': return { tone: 'success', label: '已通过' }
    case 'rejected': return { tone: 'danger', label: '已驳回' }
    case 'on_sale': return { tone: 'success', label: '已上架' }
    case 'suspended': return { tone: 'warning', label: '已挂起' }
    case 'off_sale': return { tone: 'neutral', label: '已下架' }
    default: return { tone: 'neutral', label: status }
  }
}

function chatTone(status: string): Tone {
  if (status === 'open') return 'info'
  if (status === 'pending') return 'warning'
  if (status === 'replied') return 'success'
  return 'neutral'
}

const Container = styled.div`
  max-width: 900px;
`;

const ContentCard = styled.div`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${Color.border.light};
`;

const CardTitle = styled.h3`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0;
`;

const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid ${Color.border.light};
`;

const Tab = styled.button<{ $active?: boolean }>`
  padding: 10px 20px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: none;
  color: ${({ $active }) => ($active ? Color.primary : '#666')};
  border-bottom: 2px solid ${({ $active }) => ($active ? Color.primary : 'transparent')};
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover {
    color: ${Color.primary};
  }
`;

const TabContent = styled.div`
  padding: ${Spacing.xl}px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoLabel = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`;

const InfoValue = styled.span`
  font-size: ${FontSize.base}px;
  color: ${Color.primaryHover};
`;

const MainImage = styled.img`
  width: 200px;
  height: 200px;
  object-fit: cover;
  border: 1px solid ${Color.border.light};
  border-radius: 2px;
  background: rgba(26, 23, 18, 0.03);
`;

const Description = styled.p`
  font-size: ${FontSize.sm}px;
  color: #8a8175;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const SkuTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${FontSize.sm}px;
`;

const SkuTh = styled.th`
  padding: 8px 12px;
  text-align: left;
  background: rgba(26, 23, 18, 0.03);
  border-bottom: 1px solid ${Color.border.light};
  font-weight: 500;
  color: #8a8175;
  font-size: ${FontSize.xs}px;
`;

const SkuTd = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid ${Color.border.light};
  color: ${Color.primaryHover};
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TagItem = styled.span`
  padding: 4px 12px;
  background: ${Color.border.light};
  border-radius: 2px;
  font-size: ${FontSize.xs}px;
  color: #8a8175;
`;

const AuditSection = styled.div`
  margin-top: 24px;
  padding: ${Spacing.xl}px;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
`;

const AuditTitle = styled.h3`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0 0 16px 0;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 2px;
  color: ${Color.primaryHover};
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${Color.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
`

// ── Related Chat Sessions ──

const RelatedChatLabel = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: #8a8175;
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.xs}px;
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover {
    background: #f0f4ff;
    border-color: #7c8db5;
    color: #4a6fa5;
  }
`

const ChatCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: ${Color.primary};
  color: #fff;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 9px;
`

const ChatPopup = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 360px;
  max-height: 320px;
  overflow-y: auto;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 50;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
`

const ChatPopupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid ${Color.border.light};
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.heading};
`

const ChatPopupItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid ${Color.border.light};
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(26, 23, 18, 0.03);
  }

  &:last-child {
    border-bottom: none;
  }
`

const ChatPopupItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const ChatPopupSubject = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.primaryHover};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ChatPopupMeta = styled.div`
  font-size: 0.688rem;
  color: ${Color.text.muted};
  margin-top: 2px;
`

const ChatPopupEmpty = styled.div`
  padding: 24px 16px;
  text-align: center;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`

const ChatPopupWrapper = styled.div`
  position: relative;
`;

export default function AdminProductAudit() {
  const { t, lang } = useTranslation();
  const { adminUser } = useAdminAuth()
  const isGroupLeader = adminUser?.is_group_leader ?? false
  const isSuperuser = adminUser?.is_superuser ?? false
  const canAudit = isGroupLeader || isSuperuser
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [spu, setSpu] = useState<SPUDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 步骤流：0=基本信息 1=SKU 规格 2=审核意见（StepModal 模式）
  const [activeStep, setActiveStep] = useState(0);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [relatedChats, setRelatedChats] = useState<ConversationSummary[]>([]);
  const [showChatPopup, setShowChatPopup] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getSPU(Number(id));
      setSpu(data as unknown as SPUDetail);
    } catch (err: any) {
      setError(err.message || t('admin.productAudit.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // 获取该商品相关的客服会话
  useEffect(() => {
    if (!id) return;
    adminChatAPI.getConversationsByProduct(Number(id))
      .then((res) => setRelatedChats(res.results || []))
      .catch(() => setRelatedChats([]));
  }, [id]);

  // 点击外部关闭弹窗
  useEffect(() => {
    if (!showChatPopup) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.chat-popup-area')) setShowChatPopup(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showChatPopup]);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAudit = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !remark.trim()) {
      showMsg('error', t('admin.productAudit.rejectReasonRequired'));
      return;
    }
    try {
      setSubmitting(true);
      await adminAPI.auditSPU(Number(id), {
        action,
        remark: remark.trim(),
      });
      showMsg('success', action === 'approve' ? t('admin.productAudit.auditApproved') : t('admin.productAudit.auditRejected'));
      setTimeout(() => navigate('/admin/products'), 1000);
    } catch (err: any) {
      showMsg('error', err.message || t('admin.productAudit.auditFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton type="card" rows={6} />;
  if (error) return <ErrorRetry message={t('admin.productAudit.loadError')} detail={error} onRetry={fetchDetail} />;
  if (!spu) return <ErrorRetry message={t('admin.productAudit.productNotFound')} />;

  return (
    <Container>
      <PageHeader
        title={t('admin.productAudit.title')}
        breadcrumb={[{ label: t('admin.productAudit.subtitle') }, { label: t('admin.productAudit.breadcrumbProducts') }, { label: t('admin.productAudit.breadcrumbAudit') }]}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <ContentCard>
        <CardHeader>
          <CardTitle>{spu.name}</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {relatedChats.length > 0 && (
              <ChatPopupWrapper className="chat-popup-area">
                <RelatedChatLabel onClick={() => setShowChatPopup(!showChatPopup)}>
                  💬 {t('admin.productAudit.relatedChats')} <ChatCountBadge>{relatedChats.length}</ChatCountBadge>
                </RelatedChatLabel>
                <ChatPopup $visible={showChatPopup}>
                  <ChatPopupHeader>
                    <span>{t('admin.productAudit.relatedChats')} ({relatedChats.length})</span>
                    <ChatLink
                      onClick={() => {
                        setShowChatPopup(false);
                        navigate(`/admin/chat?product_id=${spu!.id}`);
                      }}
                      tooltip={t('admin.productAudit.viewAllChats')}
                    />
                  </ChatPopupHeader>
                  {relatedChats.length === 0 ? (
                    <ChatPopupEmpty>{t('admin.productAudit.noRelatedChats')}</ChatPopupEmpty>
                  ) : (
                    relatedChats.map((chat) => (
                      <ChatPopupItem
                        key={chat.id}
                        onClick={() => {
                          setShowChatPopup(false);
                          navigate(`/admin/chat?conversation_id=${chat.id}`);
                        }}
                      >
                        <ChatPopupItemInfo>
                          <ChatPopupSubject>{chat.subject}</ChatPopupSubject>
                          <ChatPopupMeta>
                            {chat.user?.username || '-'} · {formatDateTime(chat.updated_at)}
                          </ChatPopupMeta>
                        </ChatPopupItemInfo>
                        <StatusBadge tone={chatTone(chat.status)}>
                          {chat.status === 'open' ? t('admin.chat.statusOpen') :
                           chat.status === 'closed' ? t('admin.chat.statusClosed') :
                           chat.status === 'pending' ? t('admin.chat.statusPending') :
                           chat.status === 'replied' ? t('admin.chat.statusReplied') :
                           t('admin.chat.statusClosed')}
                        </StatusBadge>
                      </ChatPopupItem>
                    ))
                  )}
                </ChatPopup>
              </ChatPopupWrapper>
            )}
            <StatusBadge tone={spuStatusMeta(spu.status).tone}>{spuStatusMeta(spu.status).label}</StatusBadge>
          </div>
        </CardHeader>

        {/* 步骤条：①基本信息 → ②SKU 规格 → ③审核意见 */}
        <div style={{ padding: '20px 20px 0' }}>
          <StepBar>
            {[
              { title: t('admin.productAudit.basicInfo') },
              { title: t('admin.productAudit.skuSpec') },
              { title: t('admin.productAudit.auditAction') },
            ].map((s, i) => {
              const state: 'done' | 'current' | 'todo' = i < activeStep ? 'done' : i === activeStep ? 'current' : 'todo'
              return (
                <StepNode key={s.title} $state={state}>
                  <span className="dot">{i < activeStep ? '✓' : i + 1}</span>
                  {s.title}
                  {i < 2 && <span className="line" />}
                </StepNode>
              )
            })}
          </StepBar>
        </div>

        <TabContent>
          {activeStep === 0 && (
            <div>
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>{t('admin.productAudit.productName')}</InfoLabel>
                  <InfoValue>{spu.name}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>{t('admin.productAudit.brand')}</InfoLabel>
                  <InfoValue>{spu.brand_name || '-'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>{t('admin.productAudit.category')}</InfoLabel>
                  <InfoValue>{spu.category_path || '-'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>{t('admin.productAudit.submittedBy')}</InfoLabel>
                  <InfoValue>{spu.submitted_by_name || '-'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>{t('admin.productAudit.submittedAt')}</InfoLabel>
                  <InfoValue>{formatDateTime(spu.submitted_at)}</InfoValue>
                </InfoItem>
              </InfoGrid>
              <div style={{ marginTop: 20 }}>
                <InfoLabel>{t('admin.productAudit.mainImage')}</InfoLabel>
                <div style={{ marginTop: 8 }}>
                  {spu.main_image ? (
                    <MainImage src={resolveMediaUrl(spu.main_image) || spu.main_image} alt={spu.name} />
                  ) : (
                    <div style={{ width: 200, height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 }}>
                      {t('admin.productAudit.noImage')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <InfoLabel>{t('admin.productAudit.description')}</InfoLabel>
                <Description>{spu.description || t('admin.productAudit.noDescription')}</Description>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>{t('admin.productAudit.skuSpec')}</h4>
              {spu.skus && spu.skus.length > 0 ? (
                <SkuTable>
                  <thead>
                    <tr>
                      <SkuTh>{t('admin.productAudit.spec')}</SkuTh>
                      <SkuTh>{t('admin.productAudit.price')}</SkuTh>
                      <SkuTh>{t('admin.productAudit.discountPrice')}</SkuTh>
                      <SkuTh>{t('admin.productAudit.stock')}</SkuTh>
                      <SkuTh>{t('admin.productAudit.status')}</SkuTh>
                    </tr>
                  </thead>
                  <tbody>
                    {spu.skus.map((sku) => (
                      <tr key={sku.id}>
                        <SkuTd>
                          {Object.entries(sku.spec_values || {}).map(([k, v]) => (
                            <span key={k} style={{ marginRight: 8, fontSize: 12, color: '#666' }}>
                              {k}: {v}
                            </span>
                          ))}
                        </SkuTd>
                        <SkuTd>${sku.price}</SkuTd>
                        <SkuTd>{sku.discount_price ? `$${sku.discount_price}` : '-'}</SkuTd>
                        <SkuTd>{sku.stock}</SkuTd>
                        <SkuTd>
                          <StatusBadge tone={sku.shelf_status === 'on' ? 'success' : 'neutral'}>
                            {sku.shelf_status === 'on' ? t('admin.productAudit.onShelf') : t('admin.productAudit.offShelf')}
                          </StatusBadge>
                        </SkuTd>
                      </tr>
                    ))}
                  </tbody>
                </SkuTable>
              ) : (
                <p style={{ color: '#999', fontSize: 13 }}>{t('admin.productAudit.noSku')}</p>
              )}
              <h4 style={{ margin: '20px 0 8px', fontSize: 14 }}>{t('admin.productAudit.tags')}</h4>
              {spu.tags && spu.tags.length > 0 ? (
                <TagList>
                  {spu.tags.map((tag) => (
                    <TagItem key={tag.id}>{tag.name}</TagItem>
                  ))}
                </TagList>
              ) : (
                <p style={{ color: '#999', fontSize: 13 }}>{t('admin.productAudit.noTags')}</p>
              )}
            </div>
          )}

          {/* 第 3 步：审核意见（仅 submitted 展示） */}
          {activeStep === 2 && spu.status === 'submitted' && (
            <div>
              <AuditTitle>{t('admin.productAudit.auditComment')}</AuditTitle>
              <Textarea
                placeholder={t('admin.productAudit.auditComment')}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
              <ButtonGroup>
                {canAudit && (
                  <>
                    <RejectBtn onClick={() => handleAudit('reject')} disabled={submitting}>
                      {submitting ? t('admin.productAudit.processing') : t('admin.productAudit.reject')}
                    </RejectBtn>
                    <ApproveBtn onClick={() => handleAudit('approve')} disabled={submitting}>
                      {submitting ? t('admin.productAudit.processing') : t('admin.productAudit.approve')}
                    </ApproveBtn>
                  </>
                )}
              </ButtonGroup>
            </div>
          )}
          {activeStep === 2 && spu.status !== 'submitted' && (
            <p style={{ color: '#999', fontSize: 13 }}>{t('admin.productAudit.auditAction')}</p>
          )}
        </TabContent>
      </ContentCard>

      {/* 步骤导航 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        {activeStep > 0 && (
          <button
            onClick={() => setActiveStep(s => s - 1)}
            style={{ padding: '8px 20px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', color: '#374151', cursor: 'pointer' }}
          >
            {t('admin.productAudit.prev') || '上一步'}
          </button>
        )}
        {activeStep < 2 && (
          <button
            onClick={() => setActiveStep(s => s + 1)}
            style={{ padding: '8px 20px', fontSize: 13, border: '1px solid #1a56db', borderRadius: 4, background: '#1a56db', color: '#fff', cursor: 'pointer' }}
          >
            {t('admin.productAudit.next') || '下一步'}
          </button>
        )}
      </div>
    </Container>
  );
}