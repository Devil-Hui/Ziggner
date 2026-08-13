// TypeScript strict mode enabled
import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import styled from 'styled-components'
import { QRCodeSVG } from 'qrcode.react';
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import PageHeader from '../../components/admin/common/PageHeader';
import DataTable from '../../components/admin/common/DataTable';
import type { Column } from '../../components/admin/common/DataTable';
import ConfirmDialog from '../../components/admin/common/ConfirmDialog';
import Pagination from '../../components/admin/common/Pagination';
import { adminAPI, Coupon, CouponFormData, type PromoCodeItem } from '../../api/admin';
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit';
import { useTranslation } from '../../i18n';
import { Input, Input as SearchInput, Select, SecondaryBtn, SecondaryBtn as GenerateBtn } from '../../components/admin/common/ui';

// ==================== Styled Components ====================

const FormOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const FormDialog = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  width: 560px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  padding: ${Spacing.xxl}px;
`;

const FormTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0 0 20px 0;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: 6px;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background: #e74c3c;
  }

  &:checked + span::before {
    transform: translateX(18px);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  inset: 0;
  background: ${Color.border.dark};
  border-radius: 22px;
  cursor: pointer;
  transition: ${Transition.normal};

  &::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    left: 3px;
    bottom: 3px;
    background: ${Color.bg.card};
    border-radius: 50%;
    transition: transform 0.2s;
  }
`;

const ToggleLabel = styled.span`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
`;

const CodeRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  input {
    flex: 1;
  }
`;

const PrimaryBtn = styled.button`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: #e74c3c;
  color: ${Color.text.inverse};
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    background: #c0392b;
  }
`;

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
`;

const Badge = styled.span<{ $variant: 'fixed' | 'percent' }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: ${FontSize.xs}px;
  font-weight: 500;
  background: ${({ $variant }) =>
    $variant === 'fixed' ? '#f5f5f5' : '#e3f2fd'};
  color: ${({ $variant }) =>
    $variant === 'fixed' ? '#c62828' : '#1565c0'};
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: ${FontSize.xs}px;
  background: ${({ $active }) => ($active ? '#e8f5e9' : '#eee')};
  color: ${({ $active }) => ($active ? '#2e7d32' : '#999')};
`;

const StackableText = styled.span<{ $stackable: boolean }>`
  color: ${({ $stackable }) => ($stackable ? '#2e7d32' : '#999')};
`;

const SearchBar = styled.div`
  margin-bottom: 12px;
`;

// ==================== Constants ====================

const PAGE_SIZE = 20;

const INITIAL_FORM: CouponFormData = {
  code: '',
  discount_type: 'fixed',
  amount: 0,
  min_amount: 0,
  max_discount: null,
  stackable: false,
  is_active: true,
  start_time: '',
  end_time: '',
  total_count: 0,
};

// ==================== Component ====================

export default function AdminCoupons() {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(INITIAL_FORM);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  // Promo codes（专属券推广码 / 引流追踪）
  const [promoTarget, setPromoTarget] = useState<Coupon | null>(null);
  const [promoList, setPromoList] = useState<PromoCodeItem[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoCreating, setPromoCreating] = useState(false);
  const [promoCopiedCode, setPromoCopiedCode] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<{ code: string; name: string } | null>(null);
  const [promoForm, setPromoForm] = useState<{ count: number; prefix: string; name: string; note: string }>({
    count: 1, prefix: '', name: '', note: '',
  });
  const [promoBusyId, setPromoBusyId] = useState<number | null>(null);
  const [promoDeleteTarget, setPromoDeleteTarget] = useState<PromoCodeItem | null>(null);

  const openPromo = async (coupon: Coupon) => {
    setPromoTarget(coupon);
    setPromoForm({ count: 1, prefix: '', name: '', note: '' });
    await fetchPromo(coupon.id);
  };

  const fetchPromo = async (couponId: number) => {
    try {
      setPromoLoading(true);
      const data = await adminAPI.getPromoDashboard(couponId);
      setPromoList(Array.isArray(data) ? data : []);
    } catch {
      setPromoList([]);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!promoTarget) return;
    try {
      setPromoCreating(true);
      await adminAPI.createPromoCodes(promoTarget.id, promoForm);
      showMsg('success', t('admin.coupons.promoCreateSuccess'));
      setPromoForm({ count: 1, prefix: '', name: '', note: '' });
      await fetchPromo(promoTarget.id);
    } catch (err: any) {
      showMsg('error', err?.message || t('admin.coupons.promoCreateFailed'));
    } finally {
      setPromoCreating(false);
    }
  };

  // 启用 / 停用单个推广码
  const handleTogglePromo = async (pc: PromoCodeItem) => {
    try {
      setPromoBusyId(pc.id);
      await adminAPI.updatePromoCode(pc.id, { is_active: !pc.is_active });
      showMsg('success', pc.is_active ? t('admin.coupons.promoDisableSuccess') : t('admin.coupons.promoEnableSuccess'));
      if (promoTarget) await fetchPromo(promoTarget.id);
    } catch (err: any) {
      showMsg('error', err?.message || t('admin.coupons.promoToggleFailed'));
    } finally {
      setPromoBusyId(null);
    }
  };

  // 删除单个推广码（二次确认）
  const handleDeletePromo = async () => {
    if (!promoDeleteTarget) return;
    try {
      setPromoBusyId(promoDeleteTarget.id);
      await adminAPI.deletePromoCode(promoDeleteTarget.id);
      showMsg('success', t('admin.coupons.promoDeleteSuccess'));
      setPromoDeleteTarget(null);
      if (promoTarget) await fetchPromo(promoTarget.id);
    } catch (err: any) {
      showMsg('error', err?.message || t('admin.coupons.promoDeleteFailed'));
    } finally {
      setPromoBusyId(null);
    }
  };

  // 直达链接：始终指向商城前台 /coupon/<code>（admin 域名自动回退到 www）
  const storefrontUrl = (code: string) => {
    const u = new URL(window.location.origin);
    if (u.hostname.startsWith('admin.')) u.hostname = u.hostname.slice('admin.'.length);
    return `${u.origin}/coupon/${encodeURIComponent(code)}`;
  };

  const copyPromoLink = async (code: string) => {
    const link = storefrontUrl(code);
    try {
      await navigator.clipboard.writeText(link);
      setPromoCopiedCode(code);
      setTimeout(() => setPromoCopiedCode(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  // ==================== Data Fetching ====================

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getCoupons({ page, search: searchText });
      if (data && Array.isArray(data.results)) {
        setCoupons(data.results);
        setTotal(data.count || 0);
      } else if (data && Array.isArray(data.items)) {
        setCoupons(data.items);
        setTotal(data.total || 0);
      } else {
        setCoupons([]);
        setTotal(0);
      }
    } catch (err: any) {
      setError(err.message || t('admin.coupons.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, searchText, t]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // ==================== Toast ====================

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // Random coupon code generator (matches backend: 8 chars, uppercase + digits)
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    updateFormField('code', code);
  };

  // ==================== Form Handlers ====================

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM,
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
    });
    setShowForm(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      amount: coupon.amount,
      min_amount: coupon.min_amount,
      max_discount: coupon.max_discount,
      stackable: coupon.stackable,
      is_active: (coupon as unknown as Record<string, unknown>).is_active !== false,
      start_time: coupon.start_time,
      end_time: coupon.end_time,
      total_count: coupon.total_count,
    });
    setShowForm(true);
  };

  const updateFormField = (field: keyof CouponFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const code = formData.code || '';
    if (!code.trim()) {
      showMsg('error', t('admin.coupons.codeRequired'));
      return;
    }
    if (formData.amount <= 0) {
      showMsg('error', t('admin.coupons.amountRequired'));
      return;
    }
    try {
      if (editingId) {
        await adminAPI.updateCoupon(editingId, {
          ...formData,
          code: code.trim(),
        });
        showMsg('success', t('admin.coupons.updateSuccess'));
      } else {
        await adminAPI.createCoupon({
          ...formData,
          code: code.trim(),
        });
        showMsg('success', t('admin.coupons.createSuccess'));
      }
      setShowForm(false);
      fetchCoupons();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.coupons.operationFailed'));
    }
  };

  const { execute: debouncedSave, isPending: isSaving } = useDebounceSubmit(handleSave, 800);

  // ==================== Delete Handler ====================

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteCoupon(deleteTarget.id);
      showMsg('success', t('admin.coupons.deleteSuccess'));
      setDeleteTarget(null);
      fetchCoupons();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.coupons.deleteFailed'));
      setDeleteTarget(null);
    }
  };

  // ==================== Helpers ====================

  const formatDiscount = (record: Coupon): string => {
    if (record.discount_type === 'fixed') {
      return t('admin.coupons.discountFormat').replace('{amount}', String(record.amount));
    }
    return `-${record.amount}%`;
  };

  const isCouponActive = (record: Coupon): boolean => {
    const now = new Date().getTime();
    const start = new Date(record.start_time).getTime();
    const end = new Date(record.end_time).getTime();
    return now >= start && now <= end;
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  // ==================== Columns ====================

  const columns: Column<Coupon>[] = [
    { key: 'id', title: 'ID', width: '60px' },
    {
      key: 'code',
      title: t('admin.coupons.columnCode'),
      width: '150px',
      render: (val) => <strong>{String(val)}</strong>,
    },
    {
      key: 'discount_type',
      title: t('admin.coupons.columnType'),
      width: '90px',
      render: (val) => (
        <Badge $variant={val as 'fixed' | 'percent'}>
          {val === 'fixed' ? t('admin.coupons.columnFixed') : t('admin.coupons.columnPercentage')}
        </Badge>
      ),
    },
    {
      key: 'amount',
      title: t('admin.coupons.columnDiscount'),
      width: '90px',
      render: (_, record) => formatDiscount(record),
    },
    {
      key: 'min_amount',
      title: t('admin.coupons.columnMinSpend'),
      width: '90px',
      render: (val) => `${val}${t('admin.coupons.columnYuan')}`,
    },
    {
      key: 'max_discount',
      title: t('admin.coupons.columnMaxDiscount'),
      width: '90px',
      render: (val) => (val != null ? `${val}${t('admin.coupons.columnYuan')}` : '-'),
    },
    {
      key: 'stackable',
      title: t('admin.coupons.columnStackable'),
      width: '70px',
      render: (val) => (
        <StackableText $stackable={Boolean(val)}>
          {val ? t('admin.coupons.columnYes') : t('admin.coupons.columnNo')}
        </StackableText>
      ),
    },
    {
      key: 'start_time',
      title: t('admin.coupons.columnValidity'),
      width: '260px',
      render: (_, record) => (
        <span style={{ color: '#999' }}>
          {new Date(record.start_time).toLocaleDateString('zh-CN')} ~ {new Date(record.end_time).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    {
      key: 'used_count',
      title: t('admin.coupons.columnUsage'),
      width: '80px',
      render: (_, record) => (
        <span>
          {t('admin.coupons.usedCountFormat')
            .replace('{used}', String(record.used_count ?? 0))
            .replace('{total}', String(record.total_count))}
        </span>
      ),
    },
    {
      key: 'status',
      title: t('admin.coupons.columnStatus'),
      width: '80px',
      render: (_, record) => (
        <StatusBadge $active={isCouponActive(record)}>
          {isCouponActive(record) ? t('admin.coupons.columnActive') : t('admin.coupons.columnExpired')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      title: t('admin.coupons.columnActions'),
      width: '190px',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              padding: '4px 10px', fontSize: 12, border: '1px solid ${Color.border.medium}',
              background: '#fff', color: '#666', borderRadius: 2, cursor: 'pointer',
            }}
            onClick={() => openEdit(record)}
          >
            {t('admin.coupons.edit')}
          </button>
          <button
            style={{
              padding: '4px 10px', fontSize: 12, border: '1px solid #2d8cf0',
              background: '#fff', color: '#2d8cf0', borderRadius: 2, cursor: 'pointer',
            }}
            onClick={() => openPromo(record)}
          >
            {t('admin.coupons.promoBtn')}
          </button>
          <button
            style={{
              padding: '4px 10px', fontSize: 12, border: '1px solid #e74c3c',
              background: '#fff', color: '#e74c3c', borderRadius: 2, cursor: 'pointer',
            }}
            onClick={() => setDeleteTarget(record)}
          >
            {t('admin.coupons.delete')}
          </button>
        </div>
      ),
    },
  ];

  // ==================== Render ====================

  return (
    <div>
      <PageHeader
        title={t('admin.coupons.title')}
        breadcrumb={[{ label: t('admin.coupons.subtitle') }, { label: t('admin.coupons.title') }]}
        actions={<PrimaryBtn onClick={openCreate}>{t('admin.coupons.createCoupon')}</PrimaryBtn>}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <SearchBar>
        <SearchInput
          type="text"
          placeholder={t('admin.coupons.searchPlaceholder')}
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </SearchBar>

      <DataTable
        columns={columns}
        data={coupons}
        loading={loading}
        error={error}
        onRetry={fetchCoupons}
        emptyTitle={t('admin.coupons.noCoupons')}
        emptyIcon="coupons"
        rowKey="id"
      />

      <Pagination
        current={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* Create / Edit Form Dialog */}
      {showForm && (
        <FormOverlay onClick={() => setShowForm(false)}>
          <FormDialog onClick={(e) => e.stopPropagation()}>
            <FormTitle>{editingId ? t('admin.coupons.editCoupon') : t('admin.coupons.newCoupon')}</FormTitle>

            <FormGroup>
              <Label>{t('admin.coupons.codeLabel')} *</Label>
              <CodeRow>
                <Input
                  value={formData.code}
                  onChange={(e) => updateFormField('code', e.target.value)}
                  placeholder={t('admin.coupons.codePlaceholder')}
                />
                {!editingId && (
                  <GenerateBtn type="button" onClick={generateCode}>
                    {t('admin.coupons.generateCode')}
                  </GenerateBtn>
                )}
              </CodeRow>
            </FormGroup>

            <FormRow>
              <FormGroup>
                <Label>{t('admin.coupons.discountType')}</Label>
                <Select
                  value={formData.discount_type}
                  onChange={(e) =>
                    updateFormField('discount_type', e.target.value)
                  }
                >
                  <option value="fixed">{t('admin.coupons.fixedAmount')}</option>
                  <option value="percent">{t('admin.coupons.percentage')}</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>
                  {formData.discount_type === 'fixed'
                    ? t('admin.coupons.amountLabel')
                    : t('admin.coupons.percentLabel')}
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={
                    formData.discount_type === 'fixed' ? t('admin.coupons.amountPlaceholder') : t('admin.coupons.percentPlaceholder')
                  }
                  value={formData.amount}
                  onChange={(e) =>
                    updateFormField('amount', Number(e.target.value))
                  }
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <Label>{t('admin.coupons.minSpendLabel')}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={t('admin.coupons.minSpendPlaceholder')}
                  value={formData.min_amount}
                  onChange={(e) =>
                    updateFormField('min_amount', Number(e.target.value))
                  }
                />
              </FormGroup>

              <FormGroup>
                <Label>{t('admin.coupons.maxDiscountLabel')}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={t('admin.coupons.maxDiscountHint')}
                  value={formData.max_discount ?? ''}
                  onChange={(e) =>
                    updateFormField(
                      'max_discount',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                />
              </FormGroup>
            </FormRow>

            <ToggleRow>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={formData.stackable}
                  onChange={(e) =>
                    updateFormField('stackable', e.target.checked)
                  }
                />
                <ToggleSlider />
              </ToggleSwitch>
              <ToggleLabel>{t('admin.coupons.stackable')}</ToggleLabel>
            </ToggleRow>

            <ToggleRow>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={formData.is_active !== false}
                  onChange={(e) =>
                    updateFormField('is_active', e.target.checked)
                  }
                />
                <ToggleSlider />
              </ToggleSwitch>
              <ToggleLabel>{t('admin.coupons.enabled')}</ToggleLabel>
            </ToggleRow>

            <FormRow>
              <FormGroup>
                <Label>{t('admin.coupons.startTime')}</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) =>
                    updateFormField('start_time', e.target.value)
                  }
                />
              </FormGroup>

              <FormGroup>
                <Label>{t('admin.coupons.endTime')}</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) =>
                    updateFormField('end_time', e.target.value)
                  }
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label>{t('admin.coupons.totalQuantity')}</Label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder={t('admin.coupons.totalQuantityPlaceholder')}
                value={formData.total_count}
                onChange={(e) =>
                  updateFormField('total_count', Number(e.target.value))
                }
              />
            </FormGroup>

            <ButtonGroup>
              <SecondaryBtn onClick={() => setShowForm(false)}>
                {t('admin.coupons.cancel')}
              </SecondaryBtn>
              <PrimaryBtn onClick={debouncedSave} disabled={isSaving}>
                {isSaving ? t('common.saving') : editingId ? t('admin.coupons.save') : t('admin.coupons.create')}
              </PrimaryBtn>
            </ButtonGroup>
          </FormDialog>
        </FormOverlay>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title={t('admin.coupons.deleteCoupon')}
          message={t('admin.coupons.confirmDeleteCoupon').replace('{code}', deleteTarget.code)}
          confirmLabel={t('admin.coupons.confirmDelete')}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Promo Code Delete Confirmation */}
      {promoDeleteTarget && (
        <ConfirmDialog
          title={t('admin.coupons.promoDeleteConfirmTitle')}
          message={t('admin.coupons.promoDeleteConfirmMsg').replace('{code}', promoDeleteTarget.code)}
          confirmLabel={t('admin.coupons.confirmDelete')}
          danger
          onConfirm={handleDeletePromo}
          onCancel={() => setPromoDeleteTarget(null)}
        />
      )}

      {/* Promo Code Management（专属券推广码 / 引流追踪） */}
      {promoTarget && (
        <FormOverlay onClick={() => setPromoTarget(null)}>
          <FormDialog onClick={(e) => e.stopPropagation()} style={{ width: 760, maxWidth: '94vw' }}>
            <FormTitle>{t('admin.coupons.promoTitle')} · {promoTarget.code}</FormTitle>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: Color.text.secondary }}>
              {t('admin.coupons.promoSubtitle')}
            </p>

            {/* 新建推广码 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, padding: 16, border: `1px solid ${Color.border.medium}`, borderRadius: 4 }}>
              <FormGroup style={{ margin: 0 }}>
                <Label>{t('admin.coupons.promoCount')}</Label>
                <Input type="number" min={1} max={200} value={promoForm.count}
                  onChange={(e) => setPromoForm((p) => ({ ...p, count: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))} />
              </FormGroup>
              <FormGroup style={{ margin: 0 }}>
                <Label>{t('admin.coupons.promoPrefix')}</Label>
                <Input value={promoForm.prefix} maxLength={8}
                  onChange={(e) => setPromoForm((p) => ({ ...p, prefix: e.target.value.toUpperCase() }))} />
              </FormGroup>
              <FormGroup style={{ margin: 0 }}>
                <Label>{t('admin.coupons.promoName')}</Label>
                <Input value={promoForm.name} maxLength={128}
                  onChange={(e) => setPromoForm((p) => ({ ...p, name: e.target.value }))} />
              </FormGroup>
              <FormGroup style={{ margin: 0 }}>
                <Label>{t('admin.coupons.promoNote')}</Label>
                <Input value={promoForm.note} maxLength={255}
                  onChange={(e) => setPromoForm((p) => ({ ...p, note: e.target.value }))} />
              </FormGroup>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <SecondaryBtn onClick={handleCreatePromo} disabled={promoCreating}>
                  {promoCreating ? t('admin.coupons.promoGenerating') : t('admin.coupons.promoCreate')}
                </SecondaryBtn>
              </div>
            </div>

            {/* 推广码列表 + 引流看板 */}
            <p style={{ margin: '0 0 8px', fontSize: 13, color: Color.text.secondary }}>
              {t('admin.coupons.promoShareHint')}
            </p>
            {promoLoading ? (
              <p>{t('common.loading')}</p>
            ) : promoList.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#999' }}>
                {t('admin.coupons.promoEmpty')}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: Color.text.secondary }}>
                      <th style={thStyle}>{t('admin.coupons.promoColCode')}</th>
                      <th style={thStyle}>{t('admin.coupons.promoColName')}</th>
                      <th style={thStyle}>{t('admin.coupons.promoColStatus')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('admin.coupons.promoColClaims')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('admin.coupons.promoColUsers')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('admin.coupons.promoColPaid')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('admin.coupons.promoColGmv')}</th>
                      <th style={thStyle}>{t('admin.coupons.promoColActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoList.map((pc) => (
                      <tr key={pc.id} style={{ borderTop: `1px solid ${Color.border.light}` }}>
                        <td style={tdStyle}><strong>{pc.code}</strong></td>
                        <td style={tdStyle}>{pc.name || '-'}</td>
                        <td style={tdStyle}>
                          <StatusBadge $active={pc.is_active}>
                            {pc.is_active ? t('admin.coupons.promoEnabled') : t('admin.coupons.promoDisabled')}
                          </StatusBadge>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{pc.claim_count}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{pc.unique_users ?? '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{pc.paid_order_count}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(pc.gmv || 0).toFixed(2)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setQrCode({ code: pc.code, name: pc.name })}
                              style={{ padding: '4px 10px', fontSize: 12, border: `1px solid ${Color.border.medium}`, background: '#fff', borderRadius: 2, cursor: 'pointer' }}
                            >
                              {t('admin.coupons.promoQr')}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyPromoLink(pc.code)}
                              style={{ padding: '4px 10px', fontSize: 12, border: `1px solid ${Color.border.medium}`, background: '#fff', borderRadius: 2, cursor: 'pointer' }}
                            >
                              {promoCopiedCode === pc.code ? t('admin.coupons.promoLinkCopied') : t('admin.coupons.promoCopyLink')}
                            </button>
                            <button
                              type="button"
                              disabled={promoBusyId === pc.id}
                              onClick={() => handleTogglePromo(pc)}
                              style={{
                                padding: '4px 10px', fontSize: 12,
                                border: `1px solid ${pc.is_active ? '#e74c3c' : '#2e7d32'}`,
                                background: '#fff', borderRadius: 2, cursor: 'pointer',
                                color: pc.is_active ? '#e74c3c' : '#2e7d32',
                                opacity: promoBusyId === pc.id ? 0.5 : 1,
                              }}
                            >
                              {pc.is_active ? t('admin.coupons.promoDisabled') : t('admin.coupons.promoEnabled')}
                            </button>
                            <button
                              type="button"
                              disabled={promoBusyId === pc.id}
                              onClick={() => setPromoDeleteTarget(pc)}
                              style={{
                                padding: '4px 10px', fontSize: 12,
                                border: '1px solid #999', background: '#fff', borderRadius: 2,
                                cursor: 'pointer', color: '#999',
                                opacity: promoBusyId === pc.id ? 0.5 : 1,
                              }}
                            >
                              {t('admin.coupons.promoDelete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${Color.border.medium}`, fontWeight: 600 }}>
                      <td style={tdStyle}>{t('admin.coupons.promoTotalRow')}</td>
                      <td style={tdStyle}></td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{promoList.reduce((s, p) => s + p.claim_count, 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{promoList.reduce((s, p) => s + (p.unique_users ?? 0), 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{promoList.reduce((s, p) => s + p.paid_order_count, 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{promoList.reduce((s, p) => s + Number(p.gmv || 0), 0).toFixed(2)}</td>
                      <td style={tdStyle}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <ButtonGroup>
              <SecondaryBtn onClick={() => setPromoTarget(null)}>{t('admin.coupons.promoClose')}</SecondaryBtn>
            </ButtonGroup>
          </FormDialog>
        </FormOverlay>
      )}

      {/* 推广码二维码 + 直达链接 */}
      {qrCode && (
        <FormOverlay onClick={() => setQrCode(null)}>
          <FormDialog onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', textAlign: 'center' }}>
            <FormTitle>{t('admin.coupons.promoQrTitle')}</FormTitle>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: Color.text.secondary }}>
              {qrCode.name ? `${qrCode.name} · ${qrCode.code}` : qrCode.code}
            </p>
            <div style={{ display: 'grid', placeItems: 'center', padding: 16, background: '#fff', border: `1px solid ${Color.border.light}`, borderRadius: 4, width: 'fit-content', margin: '0 auto 16px' }}>
              <QRCodeSVG value={storefrontUrl(qrCode.code)} size={200} level="M" includeMargin />
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: Color.text.secondary }}>{t('admin.coupons.promoDirectLink')}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <input
                readOnly
                value={storefrontUrl(qrCode.code)}
                onFocus={(e) => e.currentTarget.select()}
                style={{ flex: 1, padding: '8px 10px', fontSize: 12, border: `1px solid ${Color.border.medium}`, borderRadius: 4, background: '#fafafa', color: Color.text.secondary, minWidth: 0 }}
              />
              <SecondaryBtn onClick={() => copyPromoLink(qrCode.code)}>
                {promoCopiedCode === qrCode.code ? t('admin.coupons.promoLinkCopied') : t('admin.coupons.promoCopyLink')}
              </SecondaryBtn>
            </div>
            <ButtonGroup>
              <SecondaryBtn onClick={() => setQrCode(null)}>{t('admin.coupons.promoClose')}</SecondaryBtn>
            </ButtonGroup>
          </FormDialog>
        </FormOverlay>
      )}
    </div>
  );
}

const thStyle: CSSProperties = {
  padding: '8px 10px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '8px 10px',
  whiteSpace: 'nowrap',
};