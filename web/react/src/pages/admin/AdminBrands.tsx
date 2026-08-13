import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import { Input, Select, SecondaryBtn } from '../../components/admin/common/ui';
import PageHeader from '../../components/admin/common/PageHeader';
import DataTable from '../../components/admin/common/DataTable';
import type { Column } from '../../components/admin/common/DataTable';
import ConfirmDialog from '../../components/admin/common/ConfirmDialog';
import { adminAPI } from '../../api/admin';
import { postWithProgress } from '../../api/request';
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTranslation } from '../../i18n';

interface Brand {
  id: number;
  name: string;
  logo_url: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

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
  width: 480px;
  max-width: 90vw;
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
    border-color: #e74c3c;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
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

const UploadBtn = styled.button<{ $disabled?: boolean }>`
  padding: 8px 18px;
  font-size: ${FontSize.sm}px;
  border: 1px dashed ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  border-radius: 2px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};

  &:hover {
    border-color: #e74c3c;
    color: #e74c3c;
  }
`;

const LogoPreview = styled.div`
  position: relative;
  display: inline-block;
  padding: 8px;
  border: 1px solid ${Color.border.light};
  border-radius: 2px;
  background: ${Color.primaryLight};
`;

const LogoPreviewRemove = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: #e74c3c;
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
  padding: 0;
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
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showMsg('error', '请选择图片文件');
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // 走项目统一的 cookie + CSRF 上传通道（postWithProgress 已处理鉴权）
      const data = await postWithProgress<{ url?: string; detail?: string }>('/goods/upload/image', formData);
      if (data && data.url) {
        setFormLogo(data.url);
        showMsg('success', 'Logo 上传成功');
      } else {
        showMsg('error', data?.detail || '上传失败');
      }
    } catch (err: any) {
      showMsg('error', err?.message || '上传请求异常');
    } finally {
      setUploadingLogo(false);
      // reset input so same file can be re-selected
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormLogo('');
    setFormDesc('');
    setFormActive(true);
    setShowForm(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormName(brand.name);
    setFormLogo(brand.logo_url || '');
    setFormDesc(brand.description || '');
    setFormActive(brand.is_active);
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

  const columns: Column<Brand>[] = [
    {
      key: 'logo_url',
      title: 'Logo',
      width: '60px',
      render: (_, record) =>
        record.logo_url ? (
          <LogoImg src={record.logo_url} alt={record.name} />
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
      width: '80px',
      render: (val) => (
        <span style={{
          padding: '2px 8px',
          borderRadius: 2,
          fontSize: 12,
          background: val ? '#e8f5e9' : '#eee',
          color: val ? '#2e7d32' : '#999',
        }}>
          {val ? t('admin.brands.enabled') : t('admin.brands.disabled')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('admin.brands.actions'),
      width: '120px',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {isSuperUser && (
            <button
              style={{
                padding: '4px 10px', fontSize: 12, border: '1px solid ${Color.border.medium}', background: '#fff',
                color: '#666', borderRadius: 2, cursor: 'pointer',
              }}
              onClick={() => openEdit(record)}
            >
              {t('admin.brands.edit')}
            </button>
          )}
          {isSuperUser && (
            <button
              style={{
                padding: '4px 10px', fontSize: 12, border: '1px solid #e74c3c', background: '#fff',
                color: '#e74c3c', borderRadius: 2, cursor: 'pointer',
              }}
              onClick={() => setDeleteTarget(record)}
            >
              {t('admin.brands.delete')}
            </button>
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
        actions={isSuperUser ? <PrimaryBtn onClick={openCreate}>{t('admin.brands.createBrand')}</PrimaryBtn> : null}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder={t('admin.brands.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            height: 32, padding: '0 10px', fontSize: 13, border: '1px solid ${Color.border.medium}',
            borderRadius: 2, width: 200, outline: 'none',
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        onRetry={fetchBrands}
        emptyTitle={t('admin.brands.noBrands')}
        emptyIcon="brands"
        rowKey="id"
      />

      {showForm && (
        <FormOverlay onClick={() => setShowForm(false)}>
          <FormDialog onClick={(e) => e.stopPropagation()}>
            <FormTitle>{editingId ? t('admin.brands.editBrand') : t('admin.brands.newBrand')}</FormTitle>
            <FormGroup>
              <Label>{t('admin.brands.nameLabel')}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('admin.brands.namePlaceholder')} />
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.brands.logoLabel') || 'Logo'}</Label>
              {formLogo ? (
                <LogoPreview>
                  <img src={formLogo} alt="logo preview" style={{ maxWidth: 120, maxHeight: 80, objectFit: 'contain' }} />
                  <LogoPreviewRemove onClick={() => setFormLogo('')}>✕</LogoPreviewRemove>
                </LogoPreview>
              ) : (
                <UploadBtn
                  type="button"
                  $disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? '上传中...' : '选择图片'}
                </UploadBtn>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
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
            <ButtonGroup>
              <SecondaryBtn onClick={() => setShowForm(false)}>{t('common.cancel')}</SecondaryBtn>
              <PrimaryBtn onClick={debouncedSave} disabled={isSaving}>
                {isSaving ? t('common.saving') : editingId ? t('common.save') : t('admin.brands.create')}
              </PrimaryBtn>
            </ButtonGroup>
          </FormDialog>
        </FormOverlay>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('admin.brands.deleteBrand')}
          message={t('admin.brands.confirmDeleteBrand').replace('{name}', deleteTarget.name)}
          confirmLabel={t('admin.brands.confirmDelete')}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}