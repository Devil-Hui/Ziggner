import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { Color, FontSize } from '../../theme/tokens';
import { Input, Select, PrimaryBtn } from '../../components/admin/common/ui';
import PageHeader from '../../components/admin/common/PageHeader';
import { RefreshButton } from '../../components/admin/common';
import { SmartDataTable, Button, ConfirmDialog, FormDialog, StatusBadge } from '../../components/admin/design-system';
import type { SmartColumn } from '../../components/admin/design-system';
import { adminAPI } from '../../api/admin';
import { postWithProgress } from '../../api/request';
import { resolveMediaUrl } from '../../api/chat';
import { compressImage } from '../../utils/imageCompression';
import Upload from '../../components/admin/common/Upload';
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTranslation } from '../../i18n';
import { useUrlState } from '../../hooks/useUrlState';

interface Brand {
  id: number;
  name: string;
  logo_url: string;
  description: string;
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

  &:focus {
    outline: none;
    border-color: ${Color.primary};
  }
`;

const LogoImg = styled.img`
  width: 40px;
  height: 40px;
  object-fit: contain;
  border: 1px solid ${Color.border.light};
  border-radius: 2px;
  background: ${Color.primaryLight};
`;

const LogoPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  background: ${Color.primaryLight};
  border: 1px solid ${Color.border.light};
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${FontSize.xs}px;
  color: ${Color.border.dark};
`;

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
`;

export default function AdminBrands() {
  const { t } = useTranslation()
  const { adminUser } = useAdminAuth()
  const isSuperUser = adminUser?.is_superuser ?? false
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useUrlState<string>('q', '');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);
  // 脏数据快照：打开时记录，字段变更后 diff 决定是否启用离开二次确认
  const [formInit, setFormInit] = useState('');
  const formDirty = JSON.stringify({ name: formName, logo: formLogo, desc: formDesc, active: formActive }) !== formInit;

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getBrands();
      setBrands(data as unknown as Brand[]);
    } catch (err: any) {
      setError(err.message || t('admin.brands.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const uploadBrandLogo = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const data = await postWithProgress<{ url?: string; detail?: string }>('/goods/upload/image', formData);
    if (data && data.url) return resolveMediaUrl(data.url) ?? data.url;
    throw new Error(data?.detail || '上传失败');
  };

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormLogo('');
    setFormDesc('');
    setFormActive(true);
    setFormInit(JSON.stringify({ name: '', logo: '', desc: '', active: true }));
    setShowForm(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormName(brand.name);
    setFormLogo(brand.logo_url || '');
    setFormDesc(brand.description || '');
    setFormActive(brand.is_active);
    setFormInit(JSON.stringify({ name: brand.name, logo: brand.logo_url || '', desc: brand.description || '', active: brand.is_active }));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showMsg('error', t('admin.brands.nameRequired'));
      return;
    }
    try {
      if (editingId) {
        await adminAPI.updateBrand(editingId, {
          name: formName.trim(),
          logo_url: formLogo.trim(),
          description: formDesc.trim(),
          is_active: formActive,
        });
        showMsg('success', t('admin.brands.saveSuccess'));
      } else {
        await adminAPI.createBrand({
          name: formName.trim(),
          logo_url: formLogo.trim(),
          description: formDesc.trim(),
          is_active: formActive,
        });
        showMsg('success', t('admin.brands.createSuccess'));
      }
      setShowForm(false);
      fetchBrands();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.brands.operationFailed'));
    }
  };

  const { execute: debouncedSave, isPending: isSaving } = useDebounceSubmit(handleSave, 800);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteBrand(deleteTarget.id);
      showMsg('success', t('admin.brands.deleteSuccess'));
      setDeleteTarget(null);
      fetchBrands();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.brands.deleteFailed'));
      setDeleteTarget(null);
    }
  };

  const filtered = brands.filter((b) =>
    !searchText || b.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: SmartColumn<Brand>[] = [
    {
      key: 'logo_url',
      title: 'Logo',
      width: '60px',
      hideable: false,
      render: (_, record) =>
        record.logo_url ? (
          <LogoImg src={resolveMediaUrl(record.logo_url) ?? record.logo_url} alt={record.name} />
        ) : (
          <LogoPlaceholder>N/A</LogoPlaceholder>
        ),
    },
    { key: 'name', title: t('admin.brands.nameLabel'), sortable: true },
    {
      key: 'description',
      title: t('admin.brands.descriptionLabel'),
      render: (val) => (
        <span style={{ color: '#999', maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {String(val || '-')}
        </span>
      ),
    },
    {
      key: 'is_active',
      title: t('admin.brands.statusLabel'),
      width: '90px',
      render: (val) => (
        <StatusBadge tone={val ? 'success' : 'neutral'} dot>
          {val ? t('admin.brands.enabled') : t('admin.brands.disabled')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      title: t('admin.brands.actions'),
      width: '150px',
      hideable: false,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isSuperUser && (
            <Button size="sm" variant="ghost" onClick={() => openEdit(record)}>
              {t('admin.brands.edit')}
            </Button>
          )}
          {isSuperUser && (
            <Button size="sm" variant="danger" onClick={() => setDeleteTarget(record)}>
              {t('admin.brands.delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('admin.brands.title')}
        breadcrumb={[{ label: t('admin.brands.subtitle') }, { label: t('admin.brands.title') }]}
        actions={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{isSuperUser ? <PrimaryBtn onClick={openCreate}>{t('admin.brands.createBrand')}</PrimaryBtn> : null}<RefreshButton onRefresh={fetchBrands} /></div>}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder={t('admin.brands.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            height: 32, padding: '0 10px', fontSize: 13, border: `1px solid ${Color.border.medium}`,
            borderRadius: 6, width: 220, outline: 'none',
          }}
        />
      </div>

      <SmartDataTable<Brand>
        columns={columns}
        dataSource={filtered}
        loading={loading}
        error={error}
        onRetry={fetchBrands}
        emptyTitle={t('admin.brands.noBrands')}
        rowKey="id"
      />

      <FormDialog
        open={showForm}
        title={editingId ? t('admin.brands.editBrand') : t('admin.brands.newBrand')}
        size="sm"
        okText={editingId ? t('common.save') : t('admin.brands.create')}
        cancelText={t('common.cancel')}
        loading={isSaving}
        dirty={formDirty}
        onOk={debouncedSave}
        onCancel={() => setShowForm(false)}
      >
        <FormGroup>
          <Label>{t('admin.brands.nameLabel')}</Label>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('admin.brands.namePlaceholder')} />
        </FormGroup>
        <FormGroup>
          <Label>{t('admin.brands.logoLabel') || 'Logo'}</Label>
          <Upload
            value={formLogo ? [formLogo] : []}
            onChange={urls => setFormLogo(urls[0] ?? '')}
            upload={uploadBrandLogo}
            multiple={false}
            maxFiles={1}
            placeholder="拖拽 Logo 至此或点击上传"
          />
        </FormGroup>
        <FormGroup>
          <Label>{t('admin.brands.descriptionLabel')}</Label>
          <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder={t('admin.brands.descriptionPlaceholder')} />
        </FormGroup>
        <FormGroup>
          <Label>{t('admin.brands.statusLabel')}</Label>
          <Select value={formActive ? '1' : '0'} onChange={(e) => setFormActive(e.target.value === '1')}>
            <option value="1">{t('admin.brands.enabled')}</option>
            <option value="0">{t('admin.brands.disabled')}</option>
          </Select>
        </FormGroup>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('admin.brands.deleteBrand')}
        message={t('admin.brands.confirmDeleteBrand').replace('{name}', deleteTarget?.name ?? '')}
        tone="danger"
        confirmLabel={t('admin.brands.confirmDelete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
