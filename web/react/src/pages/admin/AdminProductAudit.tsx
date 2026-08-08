// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import PageHeader from '../../components/admin/common/PageHeader';
import LoadingSkeleton from '../../components/admin/common/LoadingSkeleton';
import ErrorRetry from '../../components/admin/common/ErrorRetry';
import StatusBadge from '../../components/admin/common/StatusBadge';
import { adminAPI } from '../../api/admin';
import { adminChatAPI, type ConversationSummary } from '../../api/chat';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTranslation } from '../../i18n';
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
  color: ${({ $active }) => ($active ? '#e74c3c' : '#666')};
  border-bottom: 2px solid ${({ $active }) => ($active ? '#e74c3c' : 'transparent')};
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover {
    color: #e74c3c;
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
    border-color: #e74c3c;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ApproveBtn = styled.button`
  padding: 8px 24px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: #27ae60;
  color: ${Color.text.inverse};
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    background: #219a52;
  }
`;

const RejectBtn = styled.button`
  padding: 8px 24px;
  font-size: ${FontSize.sm}px;
  border: 1px solid #e74c3c;
  background: ${Color.bg.card};
  color: #e74c3c;
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    background: #e74c3c;
    color: ${Color.text.inverse};
  }
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
  background: #e74c3c;
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

const ChatPopupStatus = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 0.625rem;
  font-weight: 500;
  flex-shrink: 0;
  background: ${({ $status }) => {
    switch ($status) {
      case 'open': return '#e3f2fd'
      case 'pending': return '#fff3e0'
      case 'replied': return '#e8f5e9'
      case 'closed': return '#f5f5f5'
      default: return '#f5f5f5'
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'open': return '#1565c0'
      case 'pending': return '#e65100'
      case 'replied': return '#2e7d32'
      case 'closed': return '#999'
      default: return '#999'
    }
  }};
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
  const [activeTab, setActiveTab] = useState('basic');
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
                            {chat.user?.username || '-'} · {new Date(chat.updated_at).toLocaleString(lang)}
                          </ChatPopupMeta>
                        </ChatPopupItemInfo>
                        <ChatPopupStatus $status={chat.status}>
                          {chat.status === 'open' ? t('admin.chat.statusOpen') :
                           chat.status === 'closed' ? t('admin.chat.statusClosed') :
                           chat.status === 'pending' ? t('admin.chat.statusPending') :
                           chat.status === 'replied' ? t('admin.chat.statusReplied') :
                           t('admin.chat.statusClosed')}
                        </ChatPopupStatus>
                      </ChatPopupItem>
                    ))
                  )}
                </ChatPopup>
              </ChatPopupWrapper>
            )}
            <StatusBadge status={spu.status as any} />
          </div>
        </CardHeader>

        <Tabs>
          <Tab $active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
            {t('admin.productAudit.basicInfo')}
          </Tab>
          <Tab $active={activeTab === 'sku'} onClick={() => setActiveTab('sku')}>
            {t('admin.productAudit.skuSpec')}
          </Tab>
          <Tab $active={activeTab === 'tags'} onClick={() => setActiveTab('tags')}>
            {t('admin.productAudit.tags')}
          </Tab>
        </Tabs>

        <TabContent>
          {activeTab === 'basic' && (
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
                  <InfoValue>{spu.submitted_at ? new Date(spu.submitted_at).toLocaleString(lang) : '-'}</InfoValue>
                </InfoItem>
              </InfoGrid>
              <div style={{ marginTop: 20 }}>
                <InfoLabel>{t('admin.productAudit.mainImage')}</InfoLabel>
                <div style={{ marginTop: 8 }}>
                  {spu.main_image ? (
                    <MainImage src={spu.main_image} alt={spu.name} />
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

          {activeTab === 'sku' && (
            <div>
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
                        <SkuTd>¥{sku.price}</SkuTd>
                        <SkuTd>{sku.discount_price ? `¥${sku.discount_price}` : '-'}</SkuTd>
                        <SkuTd>{sku.stock}</SkuTd>
                        <SkuTd>
                          <span style={{
                            padding: '2px 6px', borderRadius: 2, fontSize: 11,
                            background: sku.shelf_status === 'on' ? '#e8f5e9' : '#eee',
                            color: sku.shelf_status === 'on' ? '#2e7d32' : '#999',
                          }}>
                            {sku.shelf_status === 'on' ? t('admin.productAudit.onShelf') : t('admin.productAudit.offShelf')}
                          </span>
                        </SkuTd>
                      </tr>
                    ))}
                  </tbody>
                </SkuTable>
              ) : (
                <p style={{ color: '#999', fontSize: 13 }}>{t('admin.productAudit.noSku')}</p>
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div>
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
        </TabContent>
      </ContentCard>

      {spu.status === 'submitted' && (
        <AuditSection>
          <AuditTitle>{t('admin.productAudit.auditAction')}</AuditTitle>
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
        </AuditSection>
      )}
    </Container>
  );
}