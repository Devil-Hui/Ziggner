// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { Color, FontSize } from '../../theme/tokens';
import { Input, Select, PrimaryBtn } from '../../components/admin/common/ui';
import PageHeader from '../../components/admin/common/PageHeader';
import { RefreshButton } from '../../components/admin/common';
import { SmartDataTable, Button, ConfirmDialog, FormDialog, StatusBadge } from '../../components/admin/design-system';
import type { SmartColumn } from '../../components/admin/design-system';
import { adminAPI } from '../../api/admin';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTranslation } from '../../i18n';
import { formatDateTime } from '../../utils/helpers';
import { TAG_COLOR_PALETTE, DEFAULT_TAG_COLOR } from '../../constants/tagColors';
import { useUrlState } from '../../hooks/useUrlState';

interface Tag {
  id: number;
  name: string;
  tag_type?: 'product' | 'activity';
  color?: string;
  is_active: boolean;
  created_at: string;
}

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: 6px;
`;

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
`;

const ColorPalette = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ColorSwatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid ${({ $selected, $color }) => ($selected ? '#333' : 'transparent')};
  background: ${($p) => $p.$color};
  cursor: pointer;
  padding: 0;
  box-shadow: ${({ $selected }) => ($selected ? '0 0 0 1px #fff inset' : 'none')};
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.12);
  }
`;

const ColorPreview = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};

  &::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${($p) => $p.$color};
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
`;

export default function AdminTags() {
  const { t } = useTranslation()
  const { adminUser } = useAdminAuth()
  const isSuperUser = adminUser?.is_superuser ?? false
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useUrlState<string>('q', '');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(DEFAULT_TAG_COLOR);
  const [formType, setFormType] = useState<'product' | 'activity'>('product');
  const [formActive, setFormActive] = useState(true);
  // 脏数据快照：打开时记录，字段变更后 diff 决定是否启用离开二次确认
  const [formInit, setFormInit] = useState('');
  const formDirty = JSON.stringify({ name: formName, color: formColor, type: formType, active: formActive }) !== formInit;

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await adminAPI.getTags();
      const list = Array.isArray(data) ? data : data.results || [];
      setTags(list);
    } catch (err: any) {
      setError(err.message || t('admin.tags.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormColor(DEFAULT_TAG_COLOR);
    setFormActive(true);
    setFormType('product');
    setFormInit(JSON.stringify({ name: '', color: DEFAULT_TAG_COLOR, type: 'product', active: true }));
    setShowForm(true);
  };

  const openEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setFormName(tag.name);
    setFormColor(tag.color || DEFAULT_TAG_COLOR);
    setFormActive(tag.is_active);
    setFormType(tag.tag_type || 'product');
    setFormInit(JSON.stringify({ name: tag.name, color: tag.color || DEFAULT_TAG_COLOR, type: tag.tag_type || 'product', active: tag.is_active }));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showMsg('error', t('admin.tags.nameRequired'));
      return;
    }
    try {
      if (editingId) {
        await adminAPI.updateTag(editingId, { name: formName.trim(), tag_type: formType, color: formColor, is_active: formActive });
        showMsg('success', t('admin.tags.saveSuccess'));
      } else {
        await adminAPI.createTag({ name: formName.trim(), tag_type: formType, color: formColor, is_active: true });
        showMsg('success', t('admin.tags.createSuccess'));
      }
      setShowForm(false);
      fetchTags();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.tags.operationFailed'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteTag(deleteTarget.id);
      showMsg('success', t('admin.tags.deleteSuccess'));
      setDeleteTarget(null);
      fetchTags();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.tags.deleteFailed'));
      setDeleteTarget(null);
    }
  };

  const filtered = tags.filter((t) =>
    !searchText || t.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: SmartColumn<Tag>[] = [
    {
      key: 'name',
      title: t('admin.tags.nameLabel'),
      sortable: true,
      render: (_: unknown, record: Tag) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>#{record.name}</span>
          <StatusBadge tone={record.tag_type === 'activity' ? 'warning' : 'info'}>
            {record.tag_type === 'activity' ? t('admin.tags.activityTag') : t('admin.tags.productTag')}
          </StatusBadge>
        </span>
      ),
    },
    {
      key: 'color',
      title: t('admin.tags.columnColor'),
      width: '80px',
      render: (val: unknown) => {
        const colorVal = (typeof val === 'string' && val) ? val : DEFAULT_TAG_COLOR
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
              background: colorVal, border: '1px solid rgba(0,0,0,0.1)',
            }} />
          </span>
        )
      },
    },
    {
      key: 'is_active',
      title: t('admin.tags.statusLabel'),
      width: '100px',
      render: (val) => (
        <StatusBadge tone={val ? 'success' : 'neutral'} dot>
          {val ? t('admin.tags.enabled') : t('admin.tags.disabled')}
        </StatusBadge>
      ),
    },
    {
      key: 'created_at',
      title: t('admin.tags.createdAt'),
      width: '180px',
      render: (val) => (
        <span style={{ color: '#999' }}>{formatDateTime(val as string)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('admin.tags.actions'),
      width: '150px',
      hideable: false,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isSuperUser && (
            <Button size="sm" variant="ghost" onClick={() => openEdit(record)}>
              {t('admin.tags.edit')}
            </Button>
          )}
          {isSuperUser && (
            <Button size="sm" variant="danger" onClick={() => setDeleteTarget(record)}>
              {t('admin.tags.delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('admin.tags.title')}
        breadcrumb={[{ label: t('admin.tags.subtitle') }, { label: t('admin.tags.title') }]}
        actions={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{isSuperUser ? <PrimaryBtn onClick={openCreate}>{t('admin.tags.createTag')}</PrimaryBtn> : null}<RefreshButton onRefresh={fetchTags} /></div>}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder={t('admin.tags.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ height: 32, padding: '0 10px', fontSize: 13, border: `1px solid ${Color.border.medium}`, borderRadius: 6, width: 220, outline: 'none' }}
        />
      </div>

      <SmartDataTable<Tag>
        columns={columns}
        dataSource={filtered}
        loading={loading}
        error={error}
        onRetry={fetchTags}
        emptyTitle={t('admin.tags.noTags')}
        rowKey="id"
      />

      <FormDialog
        open={showForm}
        title={editingId ? t('admin.tags.editTag') : t('admin.tags.newTag')}
        size="sm"
        okText={editingId ? t('admin.tags.save') : t('admin.tags.create')}
        cancelText={t('common.cancel')}
        dirty={formDirty}
        onOk={handleSave}
        onCancel={() => setShowForm(false)}
      >
        <FormGroup>
          <Label>{t('admin.tags.nameLabel')}</Label>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('admin.tags.namePlaceholder')} />
        </FormGroup>
        <FormGroup>
          <Label>{t('admin.tags.typeLabel')}</Label>
          <Select value={formType} onChange={(e) => setFormType(e.target.value as 'product' | 'activity')}>
            <option value="product">{t('admin.tags.productOption')}</option>
            <option value="activity">{t('admin.tags.activityOption')}</option>
          </Select>
        </FormGroup>
        <FormGroup>
          <Label>{t('admin.tags.colorLabel')} <ColorPreview $color={formColor}>{formColor}</ColorPreview></Label>
          <ColorPalette>
            {TAG_COLOR_PALETTE.map((c) => (
              <ColorSwatch
                key={c}
                $color={c}
                $selected={formColor.toLowerCase() === c.toLowerCase()}
                onClick={() => setFormColor(c)}
                type="button"
                title={c}
              />
            ))}
          </ColorPalette>
        </FormGroup>
        {editingId && (
          <FormGroup>
            <Label>{t('admin.tags.statusLabel')}</Label>
            <Select value={formActive ? '1' : '0'} onChange={(e) => setFormActive(e.target.value === '1')}>
              <option value="1">{t('admin.tags.enabled')}</option>
              <option value="0">{t('admin.tags.disabled')}</option>
            </Select>
          </FormGroup>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('admin.tags.deleteTag')}
        message={t('admin.tags.confirmDeleteTag').replace('{name}', deleteTarget?.name ?? '')}
        tone="danger"
        confirmLabel={t('admin.tags.confirmDelete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
