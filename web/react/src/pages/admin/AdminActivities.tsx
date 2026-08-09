// TypeScript strict mode enabled
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import { adminAPI, Activity, ActivityFormData } from '../../api/admin';
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit';
import { useTranslation } from '../../i18n';
import {
  DataTable,
  FormDialog,
  DeleteConfirmDialog,
  SearchFilter,
} from '../../components/admin/common';
import type { Column } from '../../components/admin/common';

// ==================== Theme ====================

const PRIMARY = '#e74c3c';
const BACKGROUND = '#f8f9fa';
const SURFACE = '#fff';

// ==================== Constants ====================

const PAGE_SIZE = 10;

// ==================== Helpers ====================

function getStatus(activity: Activity, t: (key: string) => string): { label: string; color: string; bg: string } {
  const now = new Date();
  const start = new Date(activity.start_time);
  const end = new Date(activity.end_time);

  if (now < start) return { label: t('admin.activities.statusNotStarted'), color: '#f5c518', bg: '#fff7e6' };
  if (now > end) return { label: t('admin.activities.statusEnded'), color: '#999', bg: '#f5f5f5' };
  return { label: t('admin.activities.statusActive'), color: '#28a745', bg: '#f6ffed' };
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
    background: #c0392b;
  }

  &:active {
    transform: scale(0.97);
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

const Pagination = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  justify-content: flex-end;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  min-width: 36px;
  height: 36px;
  padding: 0 ${Spacing.sm}px;
  border: 1px solid ${({ $active }) => ($active ? PRIMARY : '#ddd')};
  border-radius: ${Radius.md}px;
  background: ${({ $active }) => ($active ? PRIMARY : SURFACE)};
  color: ${({ $active }) => ($active ? '#fff' : '#444')};
  font-size: ${FontSize.base}px;
  cursor: pointer;
  transition: ${Transition.normal};

  &:hover {
    border-color: ${PRIMARY};
    background: ${({ $active }) => ($active ? PRIMARY : '#f5f5f5')};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
`;

const StatusBadge = styled.span<{ $color: string; $bg: string }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: ${FontSize.xs}px;
  font-weight: 500;
  border-radius: 10px;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
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

const FormInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: ${FontSize.base}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  outline: none;
  box-sizing: border-box;
  transition: ${Transition.normal};

  &:focus {
    border-color: ${PRIMARY};
    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 10px 14px;
  font-size: ${FontSize.base}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  outline: none;
  box-sizing: border-box;
  background: ${SURFACE};
  transition: ${Transition.normal};

  &:focus {
    border-color: ${PRIMARY};
    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
  }
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
    background: #fef2f2;
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

const RuleFieldInput = styled.input`
  height: 34px;
  padding: 0 ${Spacing.sm}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  width: 100%;
  transition: ${Transition.normal};

  &:focus {
    border-color: ${PRIMARY};
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
  }
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
    background: #fef2f2;
  }
`;

const RuleTypeHint = styled.div`
  margin-top: 10px;
  padding: 10px 14px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.xs}px;
  color: #0369a1;
  line-height: 1.7;
`;

const SubmitError = styled.div`
  margin-top: 12px;
  padding: 10px 14px;
  background: #fef2f2;
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
  color: ${({ $danger }) => ($danger ? '#e74c3c' : '#e74c3c')};
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

// ==================== Component ====================

const AdminActivities: React.FC = () => {
  const { t } = useTranslation();

  /* ---- i18n-based type labels ---- */
  const ACTIVITY_TYPE_LABELS: Record<Activity['type'], string> = {
    full_reduction: t('admin.activities.typeFullReduction'),
    percent_off: t('admin.activities.typePercentOff'),
    each_full: t('admin.activities.typeEachFull'),
  };

  const TYPE_OPTIONS: { value: Activity['type']; label: string }[] = [
    { value: 'full_reduction', label: t('admin.activities.typeFullReductionDesc') },
    { value: 'percent_off', label: t('admin.activities.typePercentOffDesc') },
    { value: 'each_full', label: t('admin.activities.typeEachFullDesc') },
  ];

  /* ---- data state ---- */
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

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

  /* ---- fetch ---- */
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getActivities({ page, search });
      setActivities(response.results || response.items || []);
      setTotalCount(response.count || response.total || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('admin.activities.loadFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, search, t]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  /* ---- search ---- */
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  /* ---- dialog open/close ---- */
  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      type: activity.type,
      rule: [...activity.rule],
      start_time: activity.start_time,
      end_time: activity.end_time,
    });
    setFormErrors({});
    setDialogOpen(true);
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
    if (!Array.isArray(formData.rule) || formData.rule.length === 0) {
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
  const columns: Column<Activity>[] = [
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
          <StatusBadge $color={status.color} $bg={status.bg}>
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

  /* ---- pagination ---- */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 4) {
      for (let i = 1; i <= 7; i++) pages.push(i);
    } else if (page >= totalPages - 3) {
      for (let i = totalPages - 6; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = page - 3; i <= page + 3; i++) pages.push(i);
    }

    return (
      <Pagination>
        <PageInfo>
          {t('admin.activities.pagination')
            .replace('{totalCount}', String(totalCount))
            .replace('{page}', String(page))
            .replace('{totalPages}', String(totalPages))}
        </PageInfo>
        <PageButton
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t('admin.activities.previous')}
        </PageButton>
        {pages.map((p) => (
          <PageButton
            key={p}
            $active={p === page}
            onClick={() => setPage(p)}
          >
            {p}
          </PageButton>
        ))}
        <PageButton
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          {t('admin.activities.next')}
        </PageButton>
      </Pagination>
    );
  };

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
      </Toolbar>

      <DataTable<Activity>
        columns={columns}
        data={activities}
        loading={loading}
        error={error}
        onRetry={fetchActivities}
        emptyTitle={t('admin.activities.noActivities')}
        emptyIcon="&#127873;"
        rowKey={(record) => String(record.id)}
      />

      {renderPagination()}

      {/* Create / Edit Dialog */}
      <FormDialog
        open={dialogOpen}
        title={editingActivity ? t('admin.activities.editActivity') : t('admin.activities.createActivityTitle')}
        onClose={closeDialog}
        onSubmit={debouncedSubmit}
        submitLabel={isSaving ? t('admin.activities.submitting') : editingActivity ? t('admin.activities.saveEdit') : t('admin.activities.createActivityTitle')}
        submitDisabled={isSaving}
        width="580px"
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

        {formErrors.submit && <SubmitError>{formErrors.submit}</SubmitError>}
      </FormDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title={t('admin.activities.confirmDelete')}
        itemName={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </PageWrapper>
  );
};

export default AdminActivities;