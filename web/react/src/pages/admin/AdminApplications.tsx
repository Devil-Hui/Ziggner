// TypeScript strict mode enabled
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import { Input, Select, SecondaryBtn, PrimaryBtn } from '../../components/admin/common/ui';
import PageHeader from '../../components/admin/common/PageHeader';
import DataTable from '../../components/admin/common/DataTable';
import type { Column } from '../../components/admin/common/DataTable';
import StatusBadge from '../../components/admin/common/StatusBadge';
import { adminAPI } from '../../api/admin';
import { useTranslation } from '../../i18n';
import { formatDateTime, formatDate } from '../../utils/helpers';
import { useAdminAuth } from '../../store/AdminAuthContext';

interface Application {
  id: number;
  type: string;
  type_label: string;
  status: string;
  applicant_name: string;
  created_at: string;
  reviewed_at: string | null;
  review_comment: string | null;
  detail: Record<string, any>;
}

// ── Styled Components ──

const FormOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding-top: 40px;
`;

const FormDialog = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  padding: ${Spacing.xxl}px;
`;

const FormTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0 0 24px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid ${Color.border.light};
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const FormSectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed ${Color.border.light};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const Label = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: 6px;
  font-weight: 500;
`;

const RequiredDot = styled.span`
  color: ${Color.status.error};
  margin-right: 2px;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 8px 10px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 2px;
  color: ${Color.primaryHover};
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${Color.primary}; }
`;

const ReadOnlyField = styled.div`
  padding: 8px 10px;
  font-size: ${FontSize.sm}px;
  background: #f8f9fa;
  border: 1px solid ${Color.border.light};
  border-radius: 2px;
  color: #666;
  min-height: 20px;
  line-height: 20px;
`;

const ReadOnlyRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const ReadOnlyItem = styled.div`
  flex: 1;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${FontSize.sm}px;
  color: ${Color.primaryHover};
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${Color.primary};
`;

const FieldHint = styled.span`
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
`;

const FieldError = styled.span`
  display: block;
  font-size: 11px;
  color: ${Color.status.error};
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid ${Color.border.light};
  position: sticky;
  bottom: 0;
  background: ${Color.bg.card};
  z-index: 1;
`;

// 表格内紧凑操作按钮：复用设计系统色板，避免内联硬编码（大厂规范：一致性 + 主题适配）
const ActionSecondary = styled.button`
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  border-radius: 2px;
  cursor: pointer;
  &:hover { border-color: ${Color.border.dark}; color: ${Color.primaryHover}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ActionPrimary = styled.button`
  padding: 4px 12px;
  font-size: 12px;
  border: none;
  background: ${Color.primary};
  color: ${Color.text.inverse};
  border-radius: 2px;
  cursor: pointer;
  &:hover { background: #c0392b; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Tabs = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid ${Color.border.light};
`;

const Tab = styled.button<{ $active?: boolean }>`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: none;
  color: ${({ $active }) => ($active ? Color.primary : '#666')};
  border-bottom: 2px solid ${({ $active }) => ($active ? Color.primary : 'transparent')};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  &:hover { color: ${Color.primary}; }
`;

const Dropdown = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div<{ $open: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: 2px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
  min-width: 180px;
  display: ${({ $open }) => ($open ? 'block' : 'none')};
`;

const DropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 10px 16px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: none;
  color: ${Color.primaryHover};
  text-align: left;
  cursor: pointer;
  &:hover { background: ${Color.primaryLight}; color: ${Color.primary}; }
  &:not(:last-child) { border-bottom: 1px solid ${Color.border.light}; }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: ${Color.border.light};
  margin: 4px 0;
`;

const DropdownIcon = styled.span`
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
  transition: transform 0.2s;
`;

const ReviewOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding-top: 60px;
`;

const ReviewDialog = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 550px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  padding: ${Spacing.xxl}px;
`;

const ReviewDetailSection = styled.div`
  background: #f8f9fa;
  border-radius: 2px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
`;

const ReviewDetailLabel = styled.span`
  color: #999;
  margin-right: 8px;
`;

const ReviewDetailValue = styled.span`
  color: #333;
  font-weight: 500;
`;

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
`;

// ── Component ──

export default function AdminApplications() {
  const { t } = useTranslation();

  const typeLabels: Record<string, string> = {
    category_rename: t('admin.applications.typeCategoryRename'),
    brand_rename: t('admin.applications.typeBrandRename'),
    leader_change: t('admin.applications.typeLeaderChange'),
    coupon: t('admin.applications.typeCoupon'),
  };

  const changeTypeLabels: Record<string, string> = {
    promotion: t('admin.applications.changeTypePromotion'),
    transfer: t('admin.applications.changeTypeTransfer'),
    replacement: t('admin.applications.changeTypeReplacement'),
    departure: t('admin.applications.changeTypeDeparture'),
  };

  // ── Reference data for dropdowns ──
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // ── Main state ──
  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { adminUser } = useAdminAuth();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // ── Dropdown state ──
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Submit form ──
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ── Review ──
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ── 优惠券草稿：编辑 / 提交审核 ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // ── Fetch reference data ──
  useEffect(() => {
    async function loadRefs() {
      try {
        const [catRes, brandRes, groupRes, staffRes] = await Promise.all([
          adminAPI.getCategorySubtree(),
          adminAPI.getBrands(),
          adminAPI.getAdminGroups(),
          adminAPI.getStaffList(),
        ]);
        setCategories(flattenCategories(catRes || []));
        setBrands(brandRes || []);
        setGroups(groupRes || []);
        setStaffList((staffRes as any)?.items || []);
      } catch (error) { /* silent */ }
    }
    loadRefs();
  }, []);

  function flattenCategories(nodes: any[]): any[] {
    const result: any[] = [];
    function walk(list: any[], depth: number) {
      for (const n of list) {
        result.push({ ...n, _depth: depth });
        if (n.children?.length) walk(n.children, depth + 1);
      }
    }
    walk(nodes, 0);
    return result;
  }

  // ── Close dropdown on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [dropdownOpen]);

  // ── Close form on Escape key ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (reviewTarget) {
          setReviewTarget(null);
          setReviewComment('');
        } else if (showForm) {
          setShowForm(false);
        }
      }
    }
    if (showForm || reviewTarget) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showForm, reviewTarget]);

  // ── Fetch applications ──
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = activeTab === 'my'
        ? await adminAPI.getMyApplications()
        : await adminAPI.getPendingApplications();
      const result = data as any
      setApplications(Array.isArray(result) ? result : (result.items || result.results || []));
    } catch (err: any) {
      setError(err.message || t('admin.applications.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, t]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Open form ──
  const openForm = (type: string) => {
    setFormType(type);
    setFormData({});
    setFormErrors({});
    setShowForm(true);
    setDropdownOpen(false);
  };

  // ── Auto-fill related data ──
  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormErrors({ ...formErrors, [field]: '' });

    // Auto-fill current name when selecting category/brand/group
    if (field === 'category_id' && value) {
      const cat = categories.find(c => c.id === Number(value));
      if (cat) newData._current_name = cat.name;
    }
    if (field === 'brand_id' && value) {
      const brand = brands.find(b => b.id === Number(value));
      if (brand) newData._current_name = brand.name;
    }
    if (field === 'group_id' && value) {
      const group = groups.find(g => g.id === Number(value));
      if (group) newData._current_name = group.name;
    }

    setFormData(newData);
  };

  // ── Validation ──
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    switch (formType) {
      case 'category_rename':
        if (!formData.category_id) errors.category_id = t('admin.applications.validateRequired');
        if (!formData.new_name?.trim()) errors.new_name = t('admin.applications.validateRequired');
        if (!formData.reason?.trim()) errors.reason = t('admin.applications.validateRequired');
        break;
      case 'brand_rename':
        if (!formData.brand_id) errors.brand_id = t('admin.applications.validateRequired');
        if (!formData.new_name?.trim()) errors.new_name = t('admin.applications.validateRequired');
        if (!formData.reason?.trim()) errors.reason = t('admin.applications.validateRequired');
        break;
      case 'leader_change':
        if (!formData.group_id) errors.group_id = t('admin.applications.validateRequired');
        if (!formData.new_leader_id) errors.new_leader_id = t('admin.applications.validateRequired');
        if (!formData.reason?.trim()) errors.reason = t('admin.applications.validateRequired');
        break;
      case 'coupon':
        if (!formData.coupon_name?.trim()) errors.coupon_name = t('admin.applications.validateRequired');
        if (!formData.discount_type) errors.discount_type = t('admin.applications.validateRequired');
        if (!formData.amount || Number(formData.amount) <= 0) errors.amount = t('admin.applications.validateRequired');
        if (!formData.reason?.trim()) errors.reason = t('admin.applications.validateRequired');
        if (formData.discount_type === 'percent' && (!formData.max_discount || Number(formData.max_discount) <= 0)) {
          errors.max_discount = t('admin.applications.validateRequired');
        }
        break;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setFormSubmitting(true);
      const payload: Record<string, any> = { type: formType };
      switch (formType) {
        case 'category_rename':
          payload.category_id = Number(formData.category_id);
          payload.new_name = formData.new_name;
          payload.alternative_names = formData.alternative_names || '';
          payload.impact_spu_count = Number(formData.impact_spu_count) || 0;
          payload.reason = formData.reason;
          break;
        case 'brand_rename':
          payload.brand_id = Number(formData.brand_id);
          payload.new_name = formData.new_name;
          payload.alternative_names = formData.alternative_names || '';
          payload.impact_spu_count = Number(formData.impact_spu_count) || 0;
          payload.reason = formData.reason;
          break;
        case 'leader_change':
          payload.group_id = Number(formData.group_id);
          payload.new_leader_id = Number(formData.new_leader_id);
          payload.change_type = formData.change_type || 'replacement';
          payload.effective_date = formData.effective_date || null;
          payload.handover_plan = formData.handover_plan || '';
          payload.reason = formData.reason;
          break;
        case 'coupon':
          payload.admin_group_id = adminUser?.group_id ?? undefined;
          payload.coupon_name = formData.coupon_name;
          payload.discount_type = formData.discount_type;
          payload.coupon_code = formData.coupon_code || '';
          payload.amount = Number(formData.amount);
          payload.min_amount = Number(formData.min_amount) || 0;
          payload.max_discount = formData.max_discount ? Number(formData.max_discount) : null;
          payload.stackable = formData.stackable || false;
          payload.total_count = Number(formData.total_count) || 1000;
          payload.per_user_limit = Number(formData.per_user_limit) || 1;
          payload.start_time = formData.start_time || null;
          payload.end_time = formData.end_time || null;
          payload.applicable_categories = formData.applicable_categories || [];
          payload.applicable_products = formData.applicable_products || [];
          payload.expected_cost = formData.expected_cost ? Number(formData.expected_cost) : null;
          payload.reason = formData.reason;
          break;
      }
      if (editingId) {
        // 编辑草稿：复用 promotion revise 端点（仅更新传入字段，其余保留）
        const updatePayload = { ...payload } as Record<string, any>;
        delete updatePayload.admin_group_id;
        await adminAPI.updateCouponApplication(editingId, updatePayload);
        showMsg('success', t('admin.applications.draftSaved'));
      } else {
        await adminAPI.submitApplication(payload);
        showMsg('success', t('admin.applications.submitted'));
      }
      setShowForm(false);
      setEditingId(null);
      fetchApplications();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.applications.submitFailed'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Review ──
  const handleReview = async (action: 'approve' | 'reject') => {
    if (!reviewTarget) return;
    try {
      setReviewSubmitting(true);
      await adminAPI.reviewApplication(reviewTarget.id, {
        type: reviewTarget.type,
        action,
        comment: reviewComment,
      });
      showMsg('success', action === 'approve' ? t('admin.applications.approved') : t('admin.applications.rejected'));
      setReviewTarget(null);
      setReviewComment('');
      fetchApplications();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.applications.reviewFailed'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── 编辑优惠券草稿（预填表单）──
  const openEditForm = (record: Application) => {
    if (record.type !== 'coupon') return;
    const d = record.detail || {};
    const toLocalInput = (v?: string | null) => {
      if (!v) return '';
      // 后端 isoformat(含时区/微秒) → datetime-local 所需 yyyy-MM-ddTHH:mm
      return v.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '').split('.')[0];
    };
    setFormType('coupon');
    setFormData({
      coupon_name: d.coupon_name || '',
      coupon_code: d.coupon_code || '',
      discount_type: d.discount_type || '',
      amount: d.amount ?? '',
      min_amount: d.min_amount ?? '',
      max_discount: d.max_discount ?? '',
      stackable: !!d.stackable,
      total_count: d.total_count ?? '',
      per_user_limit: d.per_user_limit ?? '',
      start_time: toLocalInput(d.start_time),
      end_time: toLocalInput(d.end_time),
      applicable_categories: d.applicable_categories || [],
      applicable_products: d.applicable_products || [],
      applicable_brands: d.applicable_brands || [],
      expected_cost: d.expected_cost ?? '',
      expected_usage_count: d.expected_usage_count ?? '',
      target_audience: d.target_audience || '',
      campaign_purpose: d.campaign_purpose || '',
      reason: d.reason || '',
    });
    setFormErrors({});
    setEditingId(record.id);
    setShowForm(true);
  };

  // ── 提交优惠券草稿进入审核 ──
  const handleSubmitForReview = async (record: Application) => {
    try {
      setSubmittingId(record.id);
      await adminAPI.submitCouponApplication(record.id);
      showMsg('success', t('admin.applications.submitted'));
      fetchApplications();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.applications.submitForReviewFailed'));
    } finally {
      setSubmittingId(null);
    }
  };

  // ── Render form fields ──
  const renderFormFields = () => {
    switch (formType) {
      case 'category_rename':
        return (
          <>
            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionBasic')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formCategoryId')}</Label>
                <Select value={formData.category_id || ''} onChange={(e) => handleFieldChange('category_id', e.target.value)}>
                  <option value="">{t('admin.applications.formSelect')}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{'　'.repeat(c._depth)}{c.name}</option>
                  ))}
                </Select>
                {formErrors.category_id && <FieldError>{formErrors.category_id}</FieldError>}
              </FormGroup>
              {formData._current_name && (
                <ReadOnlyRow>
                  <ReadOnlyItem>
                    <Label>{t('admin.applications.formCurrentName')}</Label>
                    <ReadOnlyField>{formData._current_name}</ReadOnlyField>
                  </ReadOnlyItem>
                </ReadOnlyRow>
              )}
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formNewName')}</Label>
                <Input value={formData.new_name || ''} onChange={(e) => handleFieldChange('new_name', e.target.value)} placeholder={t('admin.applications.formNewNamePlaceholder')} />
                {formErrors.new_name && <FieldError>{formErrors.new_name}</FieldError>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.applications.formAlternativeNames')}</Label>
                <Input value={formData.alternative_names || ''} onChange={(e) => handleFieldChange('alternative_names', e.target.value)} placeholder={t('admin.applications.formAlternativeNamesPlaceholder')} />
                <FieldHint>{t('admin.applications.formAlternativeNamesHint')}</FieldHint>
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionImpact')}</FormSectionTitle>
              <FormGroup>
                <Label>{t('admin.applications.formImpactSpuCount')}</Label>
                <Input type="number" value={formData.impact_spu_count || ''} onChange={(e) => handleFieldChange('impact_spu_count', e.target.value)} placeholder="0" />
                <FieldHint>{t('admin.applications.formImpactSpuCountHint')}</FieldHint>
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionReason')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formReason')}</Label>
                <Textarea value={formData.reason || ''} onChange={(e) => handleFieldChange('reason', e.target.value)} placeholder={t('admin.applications.formReasonPlaceholder')} />
                {formErrors.reason && <FieldError>{formErrors.reason}</FieldError>}
              </FormGroup>
            </FormSection>
          </>
        );

      case 'brand_rename':
        return (
          <>
            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionBasic')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formBrandId')}</Label>
                <Select value={formData.brand_id || ''} onChange={(e) => handleFieldChange('brand_id', e.target.value)}>
                  <option value="">{t('admin.applications.formSelect')}</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
                {formErrors.brand_id && <FieldError>{formErrors.brand_id}</FieldError>}
              </FormGroup>
              {formData._current_name && (
                <ReadOnlyRow>
                  <ReadOnlyItem>
                    <Label>{t('admin.applications.formCurrentName')}</Label>
                    <ReadOnlyField>{formData._current_name}</ReadOnlyField>
                  </ReadOnlyItem>
                </ReadOnlyRow>
              )}
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formNewName')}</Label>
                <Input value={formData.new_name || ''} onChange={(e) => handleFieldChange('new_name', e.target.value)} placeholder={t('admin.applications.formNewNamePlaceholder')} />
                {formErrors.new_name && <FieldError>{formErrors.new_name}</FieldError>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.applications.formAlternativeNames')}</Label>
                <Input value={formData.alternative_names || ''} onChange={(e) => handleFieldChange('alternative_names', e.target.value)} placeholder={t('admin.applications.formAlternativeNamesPlaceholder')} />
                <FieldHint>{t('admin.applications.formAlternativeNamesHint')}</FieldHint>
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionImpact')}</FormSectionTitle>
              <FormGroup>
                <Label>{t('admin.applications.formImpactSpuCount')}</Label>
                <Input type="number" value={formData.impact_spu_count || ''} onChange={(e) => handleFieldChange('impact_spu_count', e.target.value)} placeholder="0" />
                <FieldHint>{t('admin.applications.formImpactSpuCountHint')}</FieldHint>
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionReason')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formReason')}</Label>
                <Textarea value={formData.reason || ''} onChange={(e) => handleFieldChange('reason', e.target.value)} placeholder={t('admin.applications.formReasonPlaceholder')} />
                {formErrors.reason && <FieldError>{formErrors.reason}</FieldError>}
              </FormGroup>
            </FormSection>
          </>
        );

      case 'leader_change':
        return (
          <>
            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionBasic')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formGroupId')}</Label>
                <Select value={formData.group_id || ''} onChange={(e) => handleFieldChange('group_id', e.target.value)}>
                  <option value="">{t('admin.applications.formSelect')}</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
                {formErrors.group_id && <FieldError>{formErrors.group_id}</FieldError>}
              </FormGroup>
              {formData._current_name && (
                <ReadOnlyRow>
                  <ReadOnlyItem>
                    <Label>{t('admin.applications.formCurrentGroup')}</Label>
                    <ReadOnlyField>{formData._current_name}</ReadOnlyField>
                  </ReadOnlyItem>
                </ReadOnlyRow>
              )}
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formNewLeaderId')}</Label>
                <Select value={formData.new_leader_id || ''} onChange={(e) => handleFieldChange('new_leader_id', e.target.value)}>
                  <option value="">{t('admin.applications.formSelect')}</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.username}{s.is_superuser ? ` (${t('admin.applications.superAdmin')})` : ''}</option>)}
                </Select>
                {formErrors.new_leader_id && <FieldError>{formErrors.new_leader_id}</FieldError>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.applications.formChangeType')}</Label>
                <Select value={formData.change_type || 'replacement'} onChange={(e) => handleFieldChange('change_type', e.target.value)}>
                  {Object.entries(changeTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionHandover')}</FormSectionTitle>
              <FormRow>
                <FormGroup>
                  <Label>{t('admin.applications.formEffectiveDate')}</Label>
                  <Input type="datetime-local" value={formData.effective_date || ''} onChange={(e) => handleFieldChange('effective_date', e.target.value)} />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <Label>{t('admin.applications.formHandoverPlan')}</Label>
                <Textarea value={formData.handover_plan || ''} onChange={(e) => handleFieldChange('handover_plan', e.target.value)} placeholder={t('admin.applications.formHandoverPlanPlaceholder')} />
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionReason')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formReason')}</Label>
                <Textarea value={formData.reason || ''} onChange={(e) => handleFieldChange('reason', e.target.value)} placeholder={t('admin.applications.formReasonPlaceholder')} />
                {formErrors.reason && <FieldError>{formErrors.reason}</FieldError>}
              </FormGroup>
            </FormSection>
          </>
        );

      case 'coupon':
        return (
          <>
            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionBasic')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formCouponName')}</Label>
                <Input value={formData.coupon_name || ''} onChange={(e) => handleFieldChange('coupon_name', e.target.value)} placeholder={t('admin.applications.formCouponNamePlaceholder')} />
                {formErrors.coupon_name && <FieldError>{formErrors.coupon_name}</FieldError>}
              </FormGroup>
              <FormRow>
                <FormGroup>
                  <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formDiscountType')}</Label>
                  <Select value={formData.discount_type || ''} onChange={(e) => handleFieldChange('discount_type', e.target.value)}>
                    <option value="">{t('admin.applications.formSelect')}</option>
                    <option value="fixed">{t('admin.applications.formFixedAmount')}</option>
                    <option value="percent">{t('admin.applications.formPercentage')}</option>
                  </Select>
                  {formErrors.discount_type && <FieldError>{formErrors.discount_type}</FieldError>}
                </FormGroup>
                <FormGroup>
                  <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formAmount')}</Label>
                  <Input type="number" step="0.01" value={formData.amount || ''} onChange={(e) => handleFieldChange('amount', e.target.value)} placeholder={formData.discount_type === 'percent' ? t('admin.applications.formAmountPlaceholderPercent') : t('admin.applications.formAmountPlaceholderFixed')} />
                  {formErrors.amount && <FieldError>{formErrors.amount}</FieldError>}
                </FormGroup>
              </FormRow>
              {formData.discount_type === 'percent' && (
                <FormGroup>
                  <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formMaxDiscount')}</Label>
                  <Input type="number" step="0.01" value={formData.max_discount || ''} onChange={(e) => handleFieldChange('max_discount', e.target.value)} placeholder={t('admin.applications.formMaxDiscountPlaceholder')} />
                  {formErrors.max_discount && <FieldError>{formErrors.max_discount}</FieldError>}
                </FormGroup>
              )}
              <FormGroup>
                <Label>{t('admin.applications.formCouponCode')}</Label>
                <Input value={formData.coupon_code || ''} onChange={(e) => handleFieldChange('coupon_code', e.target.value)} placeholder={t('admin.applications.formCouponCodePlaceholder')} />
                <FieldHint>{t('admin.applications.formCouponCodeHint')}</FieldHint>
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionRules')}</FormSectionTitle>
              <FormRow>
                <FormGroup>
                  <Label>{t('admin.applications.formMinSpend')}</Label>
                  <Input type="number" step="0.01" value={formData.min_amount || ''} onChange={(e) => handleFieldChange('min_amount', e.target.value)} placeholder="0.00" />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.applications.formTotalCount')}</Label>
                  <Input type="number" value={formData.total_count || '1000'} onChange={(e) => handleFieldChange('total_count', e.target.value)} placeholder="1000" />
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>{t('admin.applications.formPerUserLimit')}</Label>
                  <Input type="number" value={formData.per_user_limit || '1'} onChange={(e) => handleFieldChange('per_user_limit', e.target.value)} placeholder="1" />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.applications.formExpectedCost')}</Label>
                  <Input type="number" step="0.01" value={formData.expected_cost || ''} onChange={(e) => handleFieldChange('expected_cost', e.target.value)} placeholder={t('admin.applications.formExpectedCostPlaceholder')} />
                  <FieldHint>{t('admin.applications.formExpectedCostHint')}</FieldHint>
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>{t('admin.applications.formStartTime')}</Label>
                  <Input type="datetime-local" value={formData.start_time || ''} onChange={(e) => handleFieldChange('start_time', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.applications.formEndTime')}</Label>
                  <Input type="datetime-local" value={formData.end_time || ''} onChange={(e) => handleFieldChange('end_time', e.target.value)} />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <CheckboxLabel>
                  <Checkbox type="checkbox" checked={!!formData.stackable} onChange={(e) => handleFieldChange('stackable', e.target.checked)} />
                  {t('admin.applications.formStackable')}
                </CheckboxLabel>
              </FormGroup>
            </FormSection>

            <FormSection>
              <FormSectionTitle>{t('admin.applications.sectionReason')}</FormSectionTitle>
              <FormGroup>
                <Label><RequiredDot>*</RequiredDot>{t('admin.applications.formReason')}</Label>
                <Textarea value={formData.reason || ''} onChange={(e) => handleFieldChange('reason', e.target.value)} placeholder={t('admin.applications.formReasonPlaceholder')} />
                {formErrors.reason && <FieldError>{formErrors.reason}</FieldError>}
              </FormGroup>
            </FormSection>
          </>
        );

      default:
        return null;
    }
  };

  // ── Render review detail ──
  const renderReviewDetail = () => {
    if (!reviewTarget) return null;
    const detail = reviewTarget.detail || {};
    switch (reviewTarget.type) {
      case 'category_rename':
        return (
          <ReviewDetailSection>
            <div><ReviewDetailLabel>{t('admin.applications.sectionBasic')}</ReviewDetailLabel></div>
            <div><ReviewDetailLabel>{t('admin.applications.formCurrentName')}:</ReviewDetailLabel><ReviewDetailValue>{detail.category_name}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formNewName')}:</ReviewDetailLabel><ReviewDetailValue>{detail.new_name}</ReviewDetailValue></div>
            {detail.alternative_names && <div><ReviewDetailLabel>{t('admin.applications.formAlternativeNames')}:</ReviewDetailLabel><ReviewDetailValue>{detail.alternative_names}</ReviewDetailValue></div>}
            <div><ReviewDetailLabel>{t('admin.applications.formImpactSpuCount')}:</ReviewDetailLabel><ReviewDetailValue>{detail.impact_spu_count || 0}</ReviewDetailValue></div>
            <div style={{ marginTop: 8 }}><ReviewDetailLabel>{t('admin.applications.formReason')}:</ReviewDetailLabel><ReviewDetailValue>{detail.reason}</ReviewDetailValue></div>
          </ReviewDetailSection>
        );
      case 'brand_rename':
        return (
          <ReviewDetailSection>
            <div><ReviewDetailLabel>{t('admin.applications.sectionBasic')}</ReviewDetailLabel></div>
            <div><ReviewDetailLabel>{t('admin.applications.formCurrentName')}:</ReviewDetailLabel><ReviewDetailValue>{detail.brand_name}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formNewName')}:</ReviewDetailLabel><ReviewDetailValue>{detail.new_name}</ReviewDetailValue></div>
            {detail.alternative_names && <div><ReviewDetailLabel>{t('admin.applications.formAlternativeNames')}:</ReviewDetailLabel><ReviewDetailValue>{detail.alternative_names}</ReviewDetailValue></div>}
            <div><ReviewDetailLabel>{t('admin.applications.formImpactSpuCount')}:</ReviewDetailLabel><ReviewDetailValue>{detail.impact_spu_count || 0}</ReviewDetailValue></div>
            <div style={{ marginTop: 8 }}><ReviewDetailLabel>{t('admin.applications.formReason')}:</ReviewDetailLabel><ReviewDetailValue>{detail.reason}</ReviewDetailValue></div>
          </ReviewDetailSection>
        );
      case 'leader_change':
        return (
          <ReviewDetailSection>
            <div><ReviewDetailLabel>{t('admin.applications.sectionBasic')}</ReviewDetailLabel></div>
            <div><ReviewDetailLabel>{t('admin.applications.formCurrentGroup')}:</ReviewDetailLabel><ReviewDetailValue>{detail.group_name}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formNewLeaderId')}:</ReviewDetailLabel><ReviewDetailValue>{detail.new_leader_name}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formChangeType')}:</ReviewDetailLabel><ReviewDetailValue>{changeTypeLabels[detail.change_type] || detail.change_type}</ReviewDetailValue></div>
            {detail.effective_date && <div><ReviewDetailLabel>{t('admin.applications.formEffectiveDate')}:</ReviewDetailLabel><ReviewDetailValue>{formatDate(detail.effective_date)}</ReviewDetailValue></div>}
            {detail.handover_plan && <div><ReviewDetailLabel>{t('admin.applications.formHandoverPlan')}:</ReviewDetailLabel><ReviewDetailValue>{detail.handover_plan}</ReviewDetailValue></div>}
            <div style={{ marginTop: 8 }}><ReviewDetailLabel>{t('admin.applications.formReason')}:</ReviewDetailLabel><ReviewDetailValue>{detail.reason}</ReviewDetailValue></div>
          </ReviewDetailSection>
        );
      case 'coupon':
        return (
          <ReviewDetailSection>
            <div><ReviewDetailLabel>{t('admin.applications.sectionBasic')}</ReviewDetailLabel></div>
            <div><ReviewDetailLabel>{t('admin.applications.formCouponName')}:</ReviewDetailLabel><ReviewDetailValue>{detail.coupon_name}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formDiscountType')}:</ReviewDetailLabel><ReviewDetailValue>{detail.discount_type === 'fixed' ? t('admin.applications.formFixedAmount') : t('admin.applications.formPercentage')}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formAmount')}:</ReviewDetailLabel><ReviewDetailValue>{detail.discount_type === 'percent' ? `${detail.amount}%` : `$ ${detail.amount}`}</ReviewDetailValue></div>
            {detail.max_discount && <div><ReviewDetailLabel>{t('admin.applications.formMaxDiscount')}:</ReviewDetailLabel><ReviewDetailValue>$ {detail.max_discount}</ReviewDetailValue></div>}
            <div><ReviewDetailLabel>{t('admin.applications.formMinSpend')}:</ReviewDetailLabel><ReviewDetailValue>$ {detail.min_amount || 0}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formTotalCount')}:</ReviewDetailLabel><ReviewDetailValue>{detail.total_count}</ReviewDetailValue></div>
            <div><ReviewDetailLabel>{t('admin.applications.formPerUserLimit')}:</ReviewDetailLabel><ReviewDetailValue>{detail.per_user_limit}</ReviewDetailValue></div>
            {detail.expected_cost && <div><ReviewDetailLabel>{t('admin.applications.formExpectedCost')}:</ReviewDetailLabel><ReviewDetailValue>$ {detail.expected_cost}</ReviewDetailValue></div>}
            {detail.start_time && <div><ReviewDetailLabel>{t('admin.applications.formStartTime')}:</ReviewDetailLabel><ReviewDetailValue>{formatDateTime(detail.start_time)}</ReviewDetailValue></div>}
            {detail.end_time && <div><ReviewDetailLabel>{t('admin.applications.formEndTime')}:</ReviewDetailLabel><ReviewDetailValue>{formatDateTime(detail.end_time)}</ReviewDetailValue></div>}
            <div><ReviewDetailLabel>{t('admin.applications.formStackable')}:</ReviewDetailLabel><ReviewDetailValue>{detail.stackable ? '✓' : '✗'}</ReviewDetailValue></div>
            <div style={{ marginTop: 8 }}><ReviewDetailLabel>{t('admin.applications.formReason')}:</ReviewDetailLabel><ReviewDetailValue>{detail.reason}</ReviewDetailValue></div>
          </ReviewDetailSection>
        );
      default:
        return null;
    }
  };

  // ── Table columns ──
  const columns: Column<Application>[] = [
    {
      key: 'type',
      title: t('admin.applications.columnType'),
      width: '120px',
      render: (val) => typeLabels[String(val)] || String(val),
    },
    {
      key: 'detail',
      title: t('admin.applications.columnContent'),
      render: (val, record) => {
        const detail = val as Record<string, any> || {};
        switch (record.type) {
          case 'category_rename': return `${detail.category_name} → ${detail.new_name}`;
          case 'brand_rename': return `${detail.brand_name} → ${detail.new_name}`;
          case 'leader_change': return `${detail.group_name}: ${detail.new_leader_name}`;
          case 'coupon': return `${detail.coupon_name || t('admin.applications.typeCoupon')}: ${detail.discount_type === 'percent' ? `${detail.amount}%` : `$ ${detail.amount}`}`;
          default: return '-';
        }
      },
    },
    {
      key: 'status',
      title: t('admin.applications.columnStatus'),
      width: '100px',
      render: (val) => <StatusBadge status={String(val) as any} />,
    },
    {
      key: 'applicant_name',
      title: t('admin.applications.columnApplicant'),
      width: '100px',
    },
    {
      key: 'created_at',
      title: t('admin.applications.columnSubmittedAt'),
      width: '160px',
      render: (val) => formatDateTime(val as string),
    },
    {
      key: 'actions',
      title: t('admin.applications.columnActions'),
      width: '120px',
      render: (_, record) => {
        const actions: ReactNode[] = [];
        if (activeTab === 'pending' && record.status === 'pending') {
          actions.push(
            <ActionPrimary
              key="review"
              onClick={() => { setReviewTarget(record); setReviewComment(''); }}
            >
              {t('admin.applications.review')}
            </ActionPrimary>
          );
        }
        // 我的申请：优惠券草稿/驳回态 → 编辑 + 提交审核
        if (activeTab === 'my' && record.type === 'coupon' && (record.status === 'draft' || record.status === 'rejected')) {
          actions.push(
            <ActionSecondary
              key="edit"
              onClick={() => openEditForm(record)}
            >
              {t('common.edit')}
            </ActionSecondary>
          );
          actions.push(
            <ActionPrimary
              key="submit"
              disabled={submittingId === record.id}
              onClick={() => handleSubmitForReview(record)}
            >
              {submittingId === record.id ? t('admin.applications.formSubmitting') : t('admin.applications.submitForReview')}
            </ActionPrimary>
          );
        }
        if (actions.length === 0) return null;
        return <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>;
      },
    },
  ];

  // ── Render ──
  return (
    <div>
      <PageHeader
        title={t('admin.applications.title')}
        breadcrumb={[{ label: t('admin.applications.subtitle') }, { label: t('admin.applications.title') }]}
        actions={
          <Dropdown ref={dropdownRef}>
            <PrimaryBtn onClick={() => setDropdownOpen(!dropdownOpen)}>
              {t('admin.applications.submitApplication')}
              <DropdownIcon>{dropdownOpen ? '▲' : '▼'}</DropdownIcon>
            </PrimaryBtn>
            <DropdownMenu $open={dropdownOpen}>
              <DropdownItem onClick={() => openForm('category_rename')}>{t('admin.applications.formCategoryRename')}</DropdownItem>
              <DropdownItem onClick={() => openForm('brand_rename')}>{t('admin.applications.formBrandRename')}</DropdownItem>
              <DropdownItem onClick={() => openForm('leader_change')}>{t('admin.applications.formLeaderChange')}</DropdownItem>
              <DropdownItem onClick={() => openForm('coupon')}>{t('admin.applications.formCoupon')}</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        }
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <Tabs>
        <Tab $active={activeTab === 'my'} onClick={() => setActiveTab('my')}>
          {t('admin.applications.myApplications')}
        </Tab>
        <Tab $active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
          {t('admin.applications.filterPending')}
        </Tab>
      </Tabs>

      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        error={error}
        onRetry={fetchApplications}
        emptyTitle={t('admin.applications.noApplications')}
        emptyIcon="applications"
        rowKey="id"
      />

      {/* ── Submit Form Overlay ── */}
      {showForm && (
        <FormOverlay onClick={() => setShowForm(false)}>
          <FormDialog onClick={(e) => e.stopPropagation()}>
            <FormTitle>{t('admin.applications.formTitle').replace('{type}', typeLabels[formType] || '')}</FormTitle>
            {renderFormFields()}
            <ButtonGroup>
              <SecondaryBtn onClick={() => setShowForm(false)}>{t('admin.applications.formCancel')}</SecondaryBtn>
              <PrimaryBtn onClick={handleSubmit} disabled={formSubmitting}>
                {formSubmitting ? t('admin.applications.formSubmitting') : t('admin.applications.formSubmit')}
              </PrimaryBtn>
            </ButtonGroup>
          </FormDialog>
        </FormOverlay>
      )}

      {/* ── Review Overlay ── */}
      {reviewTarget && (
        <ReviewOverlay onClick={() => setReviewTarget(null)}>
          <ReviewDialog onClick={(e) => e.stopPropagation()}>
            <FormTitle>{t('admin.applications.reviewTitle')}</FormTitle>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              <ReviewDetailLabel>{t('admin.applications.reviewType')}</ReviewDetailLabel>
              <ReviewDetailValue>{typeLabels[reviewTarget.type] || reviewTarget.type}</ReviewDetailValue>
              <span style={{ margin: '0 12px' }}>|</span>
              <ReviewDetailLabel>{t('admin.applications.reviewApplicant')}</ReviewDetailLabel>
              <ReviewDetailValue>{reviewTarget.applicant_name}</ReviewDetailValue>
            </p>
            {renderReviewDetail()}
            <FormGroup>
              <Label>{t('admin.applications.reviewComment')}</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={t('admin.applications.reviewCommentPlaceholder')}
              />
            </FormGroup>
            <ButtonGroup>
              <SecondaryBtn onClick={() => setReviewTarget(null)}>{t('admin.applications.reviewCancel')}</SecondaryBtn>
              <button
                style={{ padding: '8px 24px', fontSize: 13, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', borderRadius: 2, cursor: 'pointer' }}
                onClick={() => handleReview('reject')}
                disabled={reviewSubmitting}
              >
                {t('admin.applications.reviewReject')}
              </button>
              <PrimaryBtn onClick={() => handleReview('approve')} disabled={reviewSubmitting}>
                {reviewSubmitting ? t('admin.applications.formSubmitting') : t('admin.applications.reviewApprove')}
              </PrimaryBtn>
            </ButtonGroup>
          </ReviewDialog>
        </ReviewOverlay>
      )}
    </div>
  );
}