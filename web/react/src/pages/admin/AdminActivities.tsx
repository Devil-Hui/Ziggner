// TypeScript strict mode enabled
import React, { useCallback, useEffect, useState, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition, Semantic } from '../../theme/tokens';
import { Input as FormInput, Input as RuleFieldInput, Select as FormSelect } from '../../components/admin/common/ui';
import { adminAPI, Activity, ActivityFormData, type TagItem, type CategoryNode, type ActivitySKULinkItem, type ScopePreviewResult } from '../../api/admin';
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit';
import { useUrlState } from '../../hooks/useUrlState';
import { useTranslation } from '../../i18n';
import { SearchFilter } from '../../components/admin/common';
import {
  SmartDataTable,
  Pagination,
  FormDialog,
  ConfirmDialog,
  StatusBadge,
} from '../../components/admin/design-system';
import type { SmartColumn } from '../../components/admin/design-system';
import { KoboyoRefreshIcon } from '../../components/admin/common/Icon';

// ==================== Theme ====================

const PRIMARY = Color.primary;
const BACKGROUND = '#f8f9fa';
const SURFACE = '#fff';

// ==================== Constants ====================

const PAGE_SIZE = 10;

// ==================== Helpers ====================

function getStatus(activity: Activity, t: (key: string) => string): { label: string; tone: 'warning' | 'neutral' | 'success' } {
  const now = new Date();
  const start = new Date(activity.start_time);
  const end = new Date(activity.end_time);

  if (now < start) return { label: t('admin.activities.statusNotStarted'), tone: 'warning' };
  if (now > end) return { label: t('admin.activities.statusEnded'), tone: 'neutral' };
  return { label: t('admin.activities.statusActive'), tone: 'success' };
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ==================== Styled Components ====================

const PageWrapper = styled.div`
  padding: ${Spacing.xxl}px;
  background: ${BACKGROUND};
  min-height: 100vh;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const PageTitle = styled.h1`
  font-size: ${FontSize.xxl}px;
  font-weight: 700;
  color: ${Color.text.heading};
  margin: 0;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: ${PRIMARY};
  color: ${Color.text.inverse};
  font-size: ${FontSize.base}px;
  font-weight: 600;
  cursor: pointer;
  transition: ${Transition.normal}, transform 0.15s;

  &:hover {
    background: ${Color.primaryHover};
  }

  &:active {
    transform: scale(0.97);
  }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const RefreshBtn = styled.button<{ $spinning?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  white-space: nowrap;
  border: 1px solid ${Color.border.medium};
  border-radius: 8px;
  background: #fff;
  color: ${Color.text.secondary};
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  transition: ${Transition.normal};
  svg {
    ${({ $spinning }) => $spinning && css`animation: ${spin} 0.8s linear infinite;`}
  }
  &:hover {
    background: ${Color.primaryLight};
    color: ${Color.primaryHover};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
`;

// ==================== Form Styles ====================

const FormGroup = styled.div`
  margin-bottom: 18px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: ${FontSize.base}px;
  font-weight: 500;
  color: ${Color.text.body};
`;

const FormError = styled.span`
  display: block;
  margin-top: 4px;
  font-size: ${FontSize.xs}px;
  color: ${PRIMARY};
`;

// ==================== Rule Builder Styles ====================

const RuleSection = styled.div`
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  overflow: hidden;
`;

const RuleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: ${Color.primaryLight};
  border-bottom: 1px solid ${Color.border.medium};
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.body};
`;

const RuleAddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: ${FontSize.xs}px;
  border: 1px dashed ${PRIMARY};
  border-radius: 6px;
  background: ${Color.bg.card};
  color: ${PRIMARY};
  cursor: pointer;
  transition: ${Transition.normal};

  &:hover {
    background: Semantic.status.danger.bg;
  }
`;

const RuleRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 36px;
  gap: 10px;
  padding: 10px 14px;
  align-items: end;
  border-bottom: 1px solid ${Color.border.light};

  &:last-child {
    border-bottom: none;
  }
`;

const RuleField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RuleFieldLabel = styled.span`
  font-size: 11px;
  color: ${Color.text.muted};
  font-weight: 500;
`;

const RuleRemoveBtn = styled.button`
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  background: ${Color.bg.card};
  color: ${Color.text.muted};
  cursor: pointer;
  font-size: 16px;
  transition: ${Transition.normal};

  &:hover {
    border-color: ${PRIMARY};
    color: ${PRIMARY};
    background: Semantic.status.danger.bg;
  }
`;

const RuleTypeHint = styled.div`
  margin-top: 10px;
  padding: 10px 14px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.xs}px;
  color: Semantic.status.info.fg;
  line-height: 1.7;
`;

const SubmitError = styled.div`
  margin-top: 12px;
  padding: 10px 14px;
  background: Semantic.status.danger.bg;
  border: 1px solid #fecaca;
  border-radius: ${Radius.md}px;
  color: ${PRIMARY};
  font-size: ${FontSize.sm}px;
`;

// ==================== Action Styles ====================

const ActionCell = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionLink = styled.span<{ $danger?: boolean }>`
  font-size: ${FontSize.sm}px;
  color: ${({ $danger }) => ($danger ? 'Semantic.status.danger.fg' : 'Color.primary')};
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

// ==================== SKU Link Styles ====================

const SkuSection = styled.div`
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  padding: 12px 14px;
  background: ${Color.bg.card};
  margin-bottom: 12px;
`;

const SkuSectionTitle = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: 4px;
`;

const SkuSectionDesc = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin-bottom: 10px;
  line-height: 1.6;
`;

const ScopeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
`;

const ScopeRadio = styled.label`
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  color: ${Color.text.body};
  cursor: pointer;
`;

const MiniBtn = styled.button<{ $danger?: boolean }>`
  height: 30px;
  padding: 0 12px;
  border: 1px solid ${({ $danger }) => ($danger ? '#fecaca' : Color.border.medium)};
  border-radius: 6px;
  background: ${({ $danger }) => ($danger ? 'Semantic.status.danger.bg' : '#fff')};
  color: ${({ $danger }) => ($danger ? 'Semantic.status.danger.fg' : 'Color.primary')};
  font-size: ${FontSize.xs}px;
  font-weight: 500;
  cursor: pointer;
  transition: ${Transition.normal};
  white-space: nowrap;

  &:hover {
    background: ${({ $danger }) => ($danger ? '#fee2e2' : Color.primaryLight)};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PreviewBox = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  font-size: ${FontSize.xs}px;
  color: Semantic.status.info.fg;
  line-height: 1.7;
`;

const PreviewSample = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #555;
  padding: 2px 0;

  & > span:first-child {
    font-weight: 600;
    color: Color.primary;
    min-width: 90px;
    white-space: nowrap;
  }
  & > span:nth-child(2) {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  & > span:last-child {
    white-space: nowrap;
  }
`;

const LinkTableWrap = styled.div`
  margin-top: 10px;
  border: 1px solid ${Color.border.light};
  border-radius: 6px;
  overflow: auto;
  max-height: 260px;
`;

const LinkTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
`;

const LinkTh = styled.th`
  position: sticky;
  top: 0;
  background: #f8f9fa;
  padding: 8px 10px;
  text-align: left;
  color: ${Color.text.secondary};
  font-weight: 600;
  border-bottom: 1px solid ${Color.border.medium};
  white-space: nowrap;
`;

const LinkTd = styled.td`
  padding: 7px 10px;
  border-bottom: 1px solid ${Color.border.light};
  color: ${Color.text.body};
  white-space: nowrap;
  &:nth-child(3) {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const LinkToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  flex-wrap: wrap;
  gap: 8px;
`;

const PriceInput = styled.input`
  width: 86px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid ${Color.border.medium};
  border-radius: 4px;
  font-size: 12px;
  text-align: right;

  &:focus {
    outline: none;
    border-color: Color.primary;
  }
`;

const LinkCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${Color.text.heading};
`;

// ==================== Component ====================

const AdminActivities: React.FC = () => {
  const { t } = useTranslation();

  /* ---- i18n-based type labels ---- */
  const ACTIVITY_TYPE_LABELS: Record<Activity['type'], string> = {
    full_reduction: t('admin.activities.typeFullReduction'),
    percent_off: t('admin.activities.typePercentOff'),
    each_full: t('admin.activities.typeEachFull'),
    flat_off: t('admin.activities.typeFlatOff'),
  };

  const TYPE_OPTIONS: { value: Activity['type']; label: string }[] = [
    { value: 'full_reduction', label: t('admin.activities.typeFullReductionDesc') },
    { value: 'percent_off', label: t('admin.activities.typePercentOffDesc') },
    { value: 'each_full', label: t('admin.activities.typeEachFullDesc') },
    { value: 'flat_off', label: t('admin.activities.typeFlatOffDesc') },
  ];

  /* ---- data state ---- */
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useUrlState<string>('page', '1');
  const pageNum = Number(page) || 1;
  const [search, setSearch] = useUrlState<string>('search', '');

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    name: '',
    type: 'full_reduction',
    rule: [{ min_amount: 0, discount: 0 }],
    start_time: '',
    end_time: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  /* ---- delete state ---- */
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);
  /* ---- SKU link state（批量关联 / 单独追加 / 关联列表） ---- */
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [skuSearchResults, setSkuSearchResults] = useState<{ id: number; sku_code: string; spu_name?: string; price?: string | number }[]>([]);
  const skuSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [linkedSkus, setLinkedSkus] = useState<ActivitySKULinkItem[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);
  /* 批量关联 scope：全部商品 / 按标签 / 按一级目录 */
  const [scopeType, setScopeType] = useState<'all' | 'tag' | 'category'>('all');
  const [scopeTagId, setScopeTagId] = useState('');
  const [scopeCategoryId, setScopeCategoryId] = useState('');
  const [tagOptions, setTagOptions] = useState<TagItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryNode[]>([]);
  const [previewResult, setPreviewResult] = useState<ScopePreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  /* 直降统一价（仅 flat_off 活动） */
  const [flatOffPrice, setFlatOffPrice] = useState('');
  const [skuBusy, setSkuBusy] = useState(false);
  const [skuToast, setSkuToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showSkuMsg = (type: 'success' | 'error', msg: string) => {
    setSkuToast({ type, msg });
    setTimeout(() => setSkuToast(null), 3000);
  };

  // 批量关联数据：标签 / 分类树
  useEffect(() => {
    adminAPI.getTags().then((res) => setTagOptions(Array.isArray(res) ? res : [])).catch(() => {})
    adminAPI.getCategoryTree().then((res) => setCategoryOptions(Array.isArray(res) ? res : [])).catch(() => {})
  }, [])

  // 拉取当前关联列表
  const fetchLinkedSkus = useCallback(async (activityId: number) => {
    setLinkedLoading(true);
    try {
      const res = await adminAPI.getActivitySKUs(activityId);
      setLinkedSkus(Array.isArray(res.items) ? res.items : []);
    } catch {
      setLinkedSkus([]);
    } finally {
      setLinkedLoading(false);
    }
  }, []);

  // 构建 scope 对象（未选全则返回 null）
  const buildScope = (): { type: 'all' | 'tag' | 'category'; tag_id?: number; category_id?: number } | null => {
    if (scopeType === 'all') return { type: 'all' };
    if (scopeType === 'tag') return scopeTagId ? { type: 'tag', tag_id: Number(scopeTagId) } : null;
    if (scopeType === 'category') return scopeCategoryId ? { type: 'category', category_id: Number(scopeCategoryId) } : null;
    return null;
  };

  // 仅直降活动传递统一活动价（满减/折扣由规则计算，不设活动价）
  const buildPricePayload = () =>
    formData.type === 'flat_off' && flatOffPrice !== '' ? { activity_price: Number(flatOffPrice) } : {};

  // 解析预览（不落库，仅统计数量 + 样例）
  const handlePreviewScope = async () => {
    if (!editingActivity) return;
    const scope = buildScope();
    if (!scope) {
      showSkuMsg('error', t('admin.activities.scopeRequired'));
      return;
    }
    setPreviewing(true);
    try {
      const res = await adminAPI.previewActivityScope({ scope });
      setPreviewResult(res);
    } catch (err: unknown) {
      setPreviewResult(null);
      showSkuMsg('error', err instanceof Error ? err.message : t('admin.activities.skuSaveFailed'));
    } finally {
      setPreviewing(false);
    }
  };

  // 批量关联：一键替换当前关联列表
  const handleReplaceScope = async () => {
    if (!editingActivity) return;
    const scope = buildScope();
    if (!scope) {
      showSkuMsg('error', t('admin.activities.scopeRequired'));
      return;
    }
    setSkuBusy(true);
    try {
      await adminAPI.setActivitySKUs(editingActivity.id, {
        mode: 'replace',
        scope,
        ...buildPricePayload(),
      });
      showSkuMsg('success', t('admin.activities.skuSaveSuccess'));
      setPreviewResult(null);
      await fetchLinkedSkus(editingActivity.id);
    } catch (err: unknown) {
      showSkuMsg('error', err instanceof Error ? err.message : t('admin.activities.skuSaveFailed'));
    } finally {
      setSkuBusy(false);
    }
  };

  // 单独追加：逐条添加 SKU（已存在幂等，不报错）
  const handleAppendSku = async (sku: { id: number; sku_code: string; spu_name?: string; price?: string | number }) => {
    if (!editingActivity) return;
    setSkuBusy(true);
    try {
      await adminAPI.setActivitySKUs(editingActivity.id, {
        mode: 'append',
        sku_ids: [sku.id],
        ...buildPricePayload(),
      });
      showSkuMsg('success', t('admin.activities.skuSaveSuccess'));
      setSkuSearchQuery('');
      setSkuSearchResults([]);
      await fetchLinkedSkus(editingActivity.id);
    } catch (err: unknown) {
      showSkuMsg('error', err instanceof Error ? err.message : t('admin.activities.skuSaveFailed'));
    } finally {
      setSkuBusy(false);
    }
  };

  // 删除单个关联
  const handleRemoveSku = async (skuId: number) => {
    if (!editingActivity) return;
    if (!window.confirm(t('admin.activities.confirmRemoveSku'))) return;
    setSkuBusy(true);
    try {
      await adminAPI.setActivitySKUs(editingActivity.id, { mode: 'remove', sku_ids: [skuId] });
      showSkuMsg('success', t('admin.activities.skuSaveSuccess'));
      await fetchLinkedSkus(editingActivity.id);
    } catch (err: unknown) {
      showSkuMsg('error', err instanceof Error ? err.message : t('admin.activities.skuSaveFailed'));
    } finally {
      setSkuBusy(false);
    }
  };

  // 一键清空
  const handleClearSkus = async () => {
    if (!editingActivity) return;
    if (!window.confirm(t('admin.activities.confirmClearLinked'))) return;
    setSkuBusy(true);
    try {
      await adminAPI.setActivitySKUs(editingActivity.id, { mode: 'clear' });
      showSkuMsg('success', t('admin.activities.skuSaveSuccess'));
      setLinkedSkus([]);
      setPreviewResult(null);
    } catch (err: unknown) {
      showSkuMsg('error', err instanceof Error ? err.message : t('admin.activities.skuSaveFailed'));
    } finally {
      setSkuBusy(false);
    }
  };

  // 直降：按商品维度单独设置活动价（留空 = 不参与直降）
  const handleSkuPriceBlur = async (skuId: number, value: string) => {
    if (!editingActivity) return;
    const isEmpty = value.trim() === '';
    const parsed = Number(value);
    if (!isEmpty && (isNaN(parsed) || parsed < 0)) {
      showSkuMsg('error', t('admin.activities.activityPricePerSkuPlaceholder'));
      await fetchLinkedSkus(editingActivity.id);
      return;
    }
    const price = isEmpty ? null : parsed;
    setSkuBusy(true);
    try {
      await adminAPI.setActivitySKUs(editingActivity.id, {
        mode: 'append',
        sku_ids: [skuId],
        sku_prices: [{ sku_id: skuId, activity_price: price }],
      });
      setLinkedSkus((prev) => prev.map((s) =>
        s.sku_id === skuId ? { ...s, activity_price: price === null ? null : String(price) } : s
      ));
      showSkuMsg('success', t('admin.activities.skuSaveSuccess'));
    } catch (err: unknown) {
      showSkuMsg('error', err instanceof Error ? err.message : t('admin.activities.skuSaveFailed'));
      await fetchLinkedSkus(editingActivity.id);
    } finally {
      setSkuBusy(false);
    }
  };

  // 导出关联列表 CSV
  const exportLinked = () => {
    const header = [
      t('admin.activities.colSpuId'), t('admin.activities.colSkuCode'), t('admin.activities.colName'),
      t('admin.activities.colPrice'), t('admin.activities.colActivityPrice'), t('admin.activities.colStatus'),
    ];
    const rows = linkedSkus.map((s) => [s.spu_id, s.sku_code, s.spu_name, s.price, s.activity_price ?? '', s.spu_status]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_${editingActivity?.id ?? 'skus'}_linked.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStatusLabel = (spuStatus: string): { label: string; tone: 'success' | 'danger' | 'neutral' | 'warning' | 'info' } => {
    const map: Record<string, { label: string; tone: 'success' | 'danger' | 'neutral' | 'warning' | 'info' }> = {
      on_sale: { label: t('admin.activities.statusOnSale'), tone: 'success' },
      off_sale: { label: t('admin.activities.statusOffSale'), tone: 'danger' },
      draft: { label: t('admin.activities.statusDraft'), tone: 'neutral' },
      suspended: { label: t('admin.activities.statusSuspended'), tone: 'warning' },
      approved: { label: t('admin.activities.statusApproved'), tone: 'info' },
      rejected: { label: t('admin.activities.statusRejected'), tone: 'danger' },
    };
    return map[spuStatus] || { label: spuStatus, tone: 'neutral' };
  };

  /* ---- SKU search & append ---- */
  const handleSkuSearch = (q: string) => {
    setSkuSearchQuery(q);
    if (skuSearchTimer.current) clearTimeout(skuSearchTimer.current);
    if (!q.trim()) {
      setSkuSearchResults([]);
      return;
    }
    skuSearchTimer.current = setTimeout(async () => {
      try {
        const res = await adminAPI.searchSKUs(q.trim());
        setSkuSearchResults(res?.items || []);
      } catch {
        setSkuSearchResults([]);
      }
    }, 300);
  };

  const handleSearchResultClick = (sku: { id: number; sku_code: string; spu_name?: string; price?: string | number }) => {
    handleAppendSku(sku);
  };

  /* ---- fetch ---- */
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getActivities({ page: pageNum, search });
      setActivities(response.results || response.items || []);
      setTotalCount(response.count || response.total || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('admin.activities.loadFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [pageNum, search, t]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  /* ---- search ---- */
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage('1');
  };

  /* ---- dialog open/close ---- */
  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity);
    setLinkedSkus([]);
    setSkuSearchQuery('');
    setSkuSearchResults([]);
    setPreviewResult(null);
    setScopeTagId('');
    setScopeCategoryId('');
    setFlatOffPrice('');
    setSkuToast(null);
    setFormData({
      name: activity.name,
      type: activity.type,
      rule: [...activity.rule],
      start_time: activity.start_time,
      end_time: activity.end_time,
    });
    setFormErrors({});
    setDialogOpen(true);
    fetchLinkedSkus(activity.id);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    // 预填默认时间窗（现在 ~ 7 天后），避免必填校验静默拦截导致"点击无响应"
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    setFormData({
      name: '',
      type: 'full_reduction',
      rule: [{ min_amount: 0, discount: 0 }],
      start_time: now.toISOString(),
      end_time: end.toISOString(),
    });
    setFormErrors({});
    setEditingActivity(null);
    setLinkedSkus([]);
    setSkuSearchQuery('');
    setSkuSearchResults([]);
    setPreviewResult(null);
    setScopeTagId('');
    setScopeCategoryId('');
    setFlatOffPrice('');
  };

  /* ---- validation ---- */
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t('admin.activities.nameRequired');
    }
    if (!formData.start_time) {
      errors.start_time = t('admin.activities.startTimeRequired');
    }
    if (!formData.end_time) {
      errors.end_time = t('admin.activities.endTimeRequired');
    }
    if (
      formData.start_time &&
      formData.end_time &&
      new Date(formData.start_time) >= new Date(formData.end_time)
    ) {
      errors.end_time = t('admin.activities.endTimeAfterStart');
    }
    // 直降活动按活动价定价，无需规则条目；满减/折扣必须有规则
    if (formData.type !== 'flat_off' && (!Array.isArray(formData.rule) || formData.rule.length === 0)) {
      errors.rule = t('admin.activities.rulesRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ---- submit ---- */
  const handleSubmit = async () => {
    if (!validate()) {
      // 校验失败给出可见汇总提示，避免"点了没反应"的假象
      setFormErrors((prev) => ({ ...prev, submit: t('admin.activities.fieldsRequired') }));
      return;
    }
    setFormErrors({});
    try {
      if (editingActivity) {
        await adminAPI.updateActivity(editingActivity.id, formData);
      } else {
        await adminAPI.createActivity(formData);
      }
      closeDialog();
      await fetchActivities();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('admin.activities.operationFailed');
      setFormErrors({ submit: message });
    }
  };

  const { execute: debouncedSubmit, isPending: isSaving } = useDebounceSubmit(handleSubmit, 800);

  /* ---- delete ---- */
  const handleDeleteClick = (activity: Activity) => {
    setDeleteTarget(activity);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAPI.deleteActivity(deleteTarget.id);
      setDeleteTarget(null);
      await fetchActivities();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('admin.activities.deleteFailed');
      setError(message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ---- columns ---- */
  const columns: SmartColumn<Activity>[] = [
    {
      key: 'name',
      title: t('admin.activities.columnName'),
      render: (_val, record) => <strong>{record.name}</strong>,
    },
    {
      key: 'type',
      title: t('admin.activities.columnType'),
      render: (_val, record) => ACTIVITY_TYPE_LABELS[record.type] || record.type,
    },
    {
      key: 'start_time',
      title: t('admin.activities.columnStartTime'),
      render: (_val, record) => formatDateTime(record.start_time),
    },
    {
      key: 'end_time',
      title: t('admin.activities.columnEndTime'),
      render: (_val, record) => formatDateTime(record.end_time),
    },
    {
      key: 'status',
      title: t('admin.activities.columnStatus'),
      render: (_val, record) => {
        const status = getStatus(record, t);
        return (
          <StatusBadge tone={status.tone}>
            {status.label}
          </StatusBadge>
        );
      },
    },
    {
      key: 'actions',
      title: t('admin.activities.columnActions'),
      width: '130px',
      render: (_val, record) => (
        <ActionCell>
          <ActionLink onClick={() => openEditDialog(record)}>{t('admin.activities.edit')}</ActionLink>
          <ActionLink $danger onClick={() => handleDeleteClick(record)}>
            {t('admin.activities.delete')}
          </ActionLink>
        </ActionCell>
      ),
    },
  ];

  /* ---- render ---- */
  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>{t('admin.activities.title')}</PageTitle>
        <CreateButton onClick={openCreateDialog}>
          {t('admin.activities.createActivity')}
        </CreateButton>
      </PageHeader>

      <Toolbar>
        <SearchFilter
          value={search}
          onChange={handleSearchChange}
          placeholder={t('admin.activities.searchPlaceholder')}
        />
        <RefreshBtn onClick={fetchActivities} disabled={loading} $spinning={loading} aria-label={t('admin.activities.refresh')}>
          <KoboyoRefreshIcon size={16} />
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            {t('admin.activities.refresh')}
          </span>
        </RefreshBtn>
      </Toolbar>

      <SmartDataTable<Activity>
        columns={columns}
        data={activities}
        loading={loading}
        error={error}
        onRetry={fetchActivities}
        emptyTitle={t('admin.activities.noActivities')}
        rowKey={(record) => String(record.id)}
      />

      <Pagination
        page={pageNum}
        pageCount={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
        total={totalCount}
        pageSize={PAGE_SIZE}
        onChange={(p) => setPage(String(p))}
      />

      {/* Create / Edit Dialog */}
      <FormDialog
        open={dialogOpen}
        title={editingActivity ? t('admin.activities.editActivity') : t('admin.activities.createActivityTitle')}
        onCancel={closeDialog}
        onOk={debouncedSubmit}
        okText={isSaving ? t('admin.activities.submitting') : editingActivity ? t('admin.activities.saveEdit') : t('admin.activities.createActivityTitle')}
        loading={isSaving}
        size="md"
      >
        <FormGroup>
          <FormLabel>{t('admin.activities.nameLabel')}</FormLabel>
          <FormInput
            placeholder={t('admin.activities.namePlaceholder')}
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
          {formErrors.name && <FormError>{formErrors.name}</FormError>}
        </FormGroup>

        <FormGroup>
          <FormLabel>{t('admin.activities.typeLabel')}</FormLabel>
          <FormSelect
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as Activity['type'],
              })
            }
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FormSelect>
        </FormGroup>

        {/* 直降活动：无规则条目，按统一活动价 / 商品维度定价 */}
        {formData.type === 'flat_off' ? (
          <FormGroup>
            <FormLabel>{t('admin.activities.flatOffPriceLabel')}</FormLabel>
            <FormInput
              type="number"
              min="0"
              step="0.01"
              placeholder={t('admin.activities.activityPricePlaceholder')}
              value={flatOffPrice}
              onChange={(e) => setFlatOffPrice(e.target.value)}
            />
            <RuleTypeHint>{t('admin.activities.flatOffHint')}</RuleTypeHint>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              {t('admin.activities.flatOffPriceHint')}
            </div>
          </FormGroup>
        ) : (
          <FormGroup>
            <FormLabel>{t('admin.activities.rules')}</FormLabel>
            <RuleSection>
              <RuleHeader>
                <span>{t('admin.activities.rulesCount').replace('{count}', String(formData.rule.length))}</span>
                <RuleAddBtn
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      rule: [...formData.rule, { min_amount: 0, discount: 0 }],
                    });
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.rule;
                      return next;
                    });
                  }}
                >
                  {t('admin.activities.addRule')}
                </RuleAddBtn>
              </RuleHeader>
              {formData.rule.map((item, idx) => (
                <RuleRow key={idx}>
                  <RuleField>
                    <RuleFieldLabel>
                      {formData.type === 'each_full' ? t('admin.activities.eachFullAmount') : t('admin.activities.thresholdAmount')}
                    </RuleFieldLabel>
                    <RuleFieldInput
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.min_amount}
                      onChange={(e) => {
                        const updated = [...formData.rule];
                        updated[idx] = { ...updated[idx], min_amount: Number(e.target.value) };
                        setFormData({ ...formData, rule: updated });
                      }}
                    />
                  </RuleField>
                  <RuleField>
                    <RuleFieldLabel>
                      {formData.type === 'percent_off' ? t('admin.activities.discount') : formData.type === 'each_full' ? t('admin.activities.eachFullReduce') : t('admin.activities.reduceAmount')}
                    </RuleFieldLabel>
                    <RuleFieldInput
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.discount}
                      onChange={(e) => {
                        const updated = [...formData.rule];
                        updated[idx] = { ...updated[idx], discount: Number(e.target.value) };
                        setFormData({ ...formData, rule: updated });
                      }}
                    />
                  </RuleField>
                  <RuleField>
                    <RuleFieldLabel>{t('admin.activities.maxDiscount')}</RuleFieldLabel>
                    <RuleFieldInput
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder={t('admin.activities.maxDiscountHint')}
                      value={item.max_discount ?? ''}
                      onChange={(e) => {
                        const updated = [...formData.rule];
                        updated[idx] = {
                          ...updated[idx],
                          max_discount: e.target.value === '' ? undefined : Number(e.target.value),
                        };
                        setFormData({ ...formData, rule: updated });
                      }}
                    />
                  </RuleField>
                  <RuleRemoveBtn
                    type="button"
                    disabled={formData.rule.length <= 1}
                    onClick={() => {
                      const updated = formData.rule.filter((_, i) => i !== idx);
                      setFormData({ ...formData, rule: updated });
                    }}
                    style={formData.rule.length <= 1 ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                  >
                    ×
                  </RuleRemoveBtn>
                </RuleRow>
              ))}
            </RuleSection>
            {formErrors.rule && <FormError>{formErrors.rule}</FormError>}
            <RuleTypeHint>
              {formData.type === 'full_reduction' && (
                <>{t('admin.activities.fullReductionHint')}</>
              )}
              {formData.type === 'percent_off' && (
                <>{t('admin.activities.percentOffHint')}</>
              )}
              {formData.type === 'each_full' && (
                <>{t('admin.activities.eachFullHint')}</>
              )}
            </RuleTypeHint>
          </FormGroup>
        )}

        <FormGroup>
          <FormLabel>{t('admin.activities.startTime')}</FormLabel>
          <FormInput
            type="datetime-local"
            value={toDatetimeLocal(formData.start_time)}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return; // 清空不更新，保留默认值
              const d = new Date(v);
              if (isNaN(d.getTime())) return; // 无效值（如原生 setter 注入伪影）不进入 state
              setFormData({ ...formData, start_time: d.toISOString() });
            }}
          />
          {formErrors.start_time && (
            <FormError>{formErrors.start_time}</FormError>
          )}
        </FormGroup>

        <FormGroup>
          <FormLabel>{t('admin.activities.endTime')}</FormLabel>
          <FormInput
            type="datetime-local"
            value={toDatetimeLocal(formData.end_time)}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return; // 清空不更新，保留默认值
              const d = new Date(v);
              if (isNaN(d.getTime())) return; // 无效值（如原生 setter 注入伪影）不进入 state
              setFormData({ ...formData, end_time: d.toISOString() });
            }}
          />
          {formErrors.end_time && (
            <FormError>{formErrors.end_time}</FormError>
          )}
        </FormGroup>

        {/* SKU 关联（仅编辑模式）：批量关联 / 单独追加 / 关联列表 */}
        {editingActivity && (
          <FormGroup>
            <FormLabel>{t('admin.activities.skuLinkTitle')}</FormLabel>

            {/* ① 批量关联：标签 / 一级目录 / 全站上架，解析预览 + 一键替换 */}
            <SkuSection>
              <SkuSectionTitle>{t('admin.activities.batchLinkTitle')}</SkuSectionTitle>
              <SkuSectionDesc>{t('admin.activities.batchLinkDesc')}</SkuSectionDesc>
              <ScopeRow>
                <ScopeRadio>
                  <input
                    type="radio"
                    checked={scopeType === 'all'}
                    onChange={() => { setScopeType('all'); setPreviewResult(null); }}
                  />
                  {t('admin.activities.scopeAll')}
                </ScopeRadio>
                <ScopeRadio>
                  <input
                    type="radio"
                    checked={scopeType === 'tag'}
                    onChange={() => { setScopeType('tag'); setPreviewResult(null); }}
                  />
                  {t('admin.activities.scopeTag')}
                </ScopeRadio>
                {scopeType === 'tag' && (
                  <FormSelect
                    value={scopeTagId}
                    onChange={(e) => { setScopeTagId(e.target.value); setPreviewResult(null); }}
                    style={{ height: 28, fontSize: 12 }}
                  >
                    <option value="">{t('admin.activities.scopeSelectPlaceholder')}</option>
                    {tagOptions.filter((tg) => tg.is_active !== false).map((tg) => (
                      <option key={tg.id} value={tg.id}>#{tg.name}</option>
                    ))}
                  </FormSelect>
                )}
                <ScopeRadio>
                  <input
                    type="radio"
                    checked={scopeType === 'category'}
                    onChange={() => { setScopeType('category'); setPreviewResult(null); }}
                  />
                  {t('admin.activities.scopeCategory')}
                </ScopeRadio>
                {scopeType === 'category' && (
                  <FormSelect
                    value={scopeCategoryId}
                    onChange={(e) => { setScopeCategoryId(e.target.value); setPreviewResult(null); }}
                    style={{ height: 28, fontSize: 12 }}
                  >
                    <option value="">{t('admin.activities.scopeSelectPlaceholder')}</option>
                    {categoryOptions.filter((c) => c.level === 1 || !c.level).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </FormSelect>
                )}
              </ScopeRow>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <MiniBtn onClick={handlePreviewScope} disabled={previewing || skuBusy}>
                  {previewing ? '...' : t('admin.activities.previewScope')}
                </MiniBtn>
                <MiniBtn onClick={handleReplaceScope} disabled={skuBusy}>
                  {t('admin.activities.replaceLinked')}
                </MiniBtn>
                <span style={{ fontSize: 11, color: '#999' }}>{t('admin.activities.previewScopeHint')}</span>
              </div>
              {previewResult && (
                <PreviewBox>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {t('admin.activities.previewScopeResult').replace('{count}', String(previewResult.count))}
                  </div>
                  {previewResult.items.slice(0, 6).map((it) => (
                    <PreviewSample key={it.sku_id}>
                      <span>{it.sku_code}</span>
                      <span>{it.spu_name}</span>
                      <span>${it.price}</span>
                    </PreviewSample>
                  ))}
                  {previewResult.items.length === 0 && (
                    <div style={{ color: '#888' }}>—</div>
                  )}
                </PreviewBox>
              )}
            </SkuSection>

            {/* ② 单独追加：按 SKU 名称 / 编码模糊搜索，逐条添加 */}
            <SkuSection>
              <SkuSectionTitle>{t('admin.activities.appendTitle')}</SkuSectionTitle>
              <SkuSectionDesc>{t('admin.activities.appendDesc')}</SkuSectionDesc>
              <div style={{ position: 'relative' }}>
                <FormInput
                  placeholder={t('admin.activities.skuSearchPlaceholder')}
                  value={skuSearchQuery}
                  onChange={(e) => handleSkuSearch(e.target.value)}
                />
                {skuSearchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0,
                      background: '#fff', border: '1px solid #ddd', borderRadius: 6,
                      maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {skuSearchResults.map((sku) => (
                      <div
                        key={sku.id}
                        onClick={() => handleSearchResultClick(sku)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                          display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'Color.primary', whiteSpace: 'nowrap' }}>{sku.sku_code}</span>
                        <span style={{ color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sku.spu_name}</span>
                        <span style={{ color: '#111', whiteSpace: 'nowrap' }}>${sku.price}</span>
                        <MiniBtn style={{ height: 22, padding: '0 8px' }}>{t('admin.activities.appendSku')}</MiniBtn>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SkuSection>

            {/* ③ 当前已关联列表：ID / 名称 / 原价 / 活动价（直降可编辑）/ 状态，支持删除 / 清空 / 导出 */}
            <SkuSection>
              <LinkToolbar>
                <LinkCount>{t('admin.activities.linkedListTitle').replace('{count}', String(linkedSkus.length))}</LinkCount>
                <div style={{ display: 'flex', gap: 8 }}>
                  <MiniBtn onClick={exportLinked} disabled={linkedSkus.length === 0}>
                    {t('admin.activities.exportLinked')}
                  </MiniBtn>
                  <MiniBtn $danger onClick={handleClearSkus} disabled={linkedSkus.length === 0 || skuBusy}>
                    {t('admin.activities.clearLinked')}
                  </MiniBtn>
                </div>
              </LinkToolbar>
              {linkedLoading ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#999', fontSize: 12 }}>...</div>
              ) : linkedSkus.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#999', fontSize: 12 }}>
                  {t('admin.activities.linkedEmpty')}
                </div>
              ) : (
                <LinkTableWrap>
                  <LinkTable>
                    <thead>
                      <tr>
                        <LinkTh>{t('admin.activities.colSpuId')}</LinkTh>
                        <LinkTh>{t('admin.activities.colSkuCode')}</LinkTh>
                        <LinkTh>{t('admin.activities.colName')}</LinkTh>
                        <LinkTh>{t('admin.activities.colPrice')}</LinkTh>
                        <LinkTh>{t('admin.activities.colActivityPrice')}</LinkTh>
                        <LinkTh>{t('admin.activities.colStatus')}</LinkTh>
                        <LinkTh>{t('admin.activities.colActions')}</LinkTh>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedSkus.map((s) => {
                        const st = handleStatusLabel(s.spu_status);
                        return (
                          <tr key={s.sku_id}>
                            <LinkTd>{s.spu_id}</LinkTd>
                            <LinkTd style={{ fontWeight: 600, color: 'Color.primary' }}>{s.sku_code}</LinkTd>
                            <LinkTd>{s.spu_name}</LinkTd>
                            <LinkTd>${s.price}</LinkTd>
                            <LinkTd>
                              {formData.type === 'flat_off' ? (
                                <PriceInput
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={t('admin.activities.activityPricePerSkuPlaceholder')}
                                  defaultValue={s.activity_price ?? ''}
                                  onBlur={(e) => handleSkuPriceBlur(s.sku_id, e.target.value)}
                                />
                              ) : (
                                <span style={{ color: s.activity_price ? '#111' : '#bbb' }}>
                                  {s.activity_price ? `$${s.activity_price}` : '—'}
                                </span>
                              )}
                            </LinkTd>
                            <LinkTd>
                              <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                            </LinkTd>
                            <LinkTd>
                              <ActionLink $danger onClick={() => handleRemoveSku(s.sku_id)}>
                                {t('admin.activities.delete')}
                              </ActionLink>
                            </LinkTd>
                          </tr>
                        );
                      })}
                    </tbody>
                  </LinkTable>
                </LinkTableWrap>
              )}
            </SkuSection>

            {skuToast && (
              <div style={{ color: skuToast.type === 'success' ? '#2ecc71' : Color.primary, fontSize: 12, marginTop: 6 }}>
                {skuToast.msg}
              </div>
            )}
          </FormGroup>
        )}

        {formErrors.submit && <SubmitError>{formErrors.submit}</SubmitError>}
      </FormDialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('admin.activities.confirmDelete')}
        message={`确定要删除活动「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </PageWrapper>
  );
};

export default AdminActivities;