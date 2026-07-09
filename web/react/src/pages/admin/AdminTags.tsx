// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import PageHeader from '../../components/admin/common/PageHeader';
import DataTable from '../../components/admin/common/DataTable';
import type { Column } from '../../components/admin/common/DataTable';
import ConfirmDialog from '../../components/admin/common/ConfirmDialog';
import { adminAPI } from '../../api/admin';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTranslation } from '../../i18n';
import { TAG_COLOR_PALETTE, DEFAULT_TAG_COLOR } from '../../constants/tagColors';

interface Tag {
  id: number;
  name: string;
  color?: string;
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
  width: 400px;
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

const Input = styled.input`
  width: 100%;
  height: 36px;
  padding: 0 ${Spacing.sm}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 2px;
  color: ${Color.primaryHover};
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #e74c3c;
  }
`;

const Select = styled.select`
  width: 100%;
  height: 36px;
  padding: 0 ${Spacing.sm}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 2px;
  color: ${Color.primaryHover};
  background: ${Color.bg.card};

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

const SecondaryBtn = styled.button`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    border-color: ${Color.border.dark};
    color: ${Color.primaryHover};
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
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(DEFAULT_TAG_COLOR);
  const [formActive, setFormActive] = useState(true);

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
    setShowForm(true);
  };

  const openEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setFormName(tag.name);
    setFormColor(tag.color || DEFAULT_TAG_COLOR);
    setFormActive(tag.is_active);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showMsg('error', t('admin.tags.nameRequired'));
      return;
    }
    try {
      if (editingId) {
        await adminAPI.updateTag(editingId, { name: formName.trim(), color: formColor, is_active: formActive });
        showMsg('success', t('admin.tags.saveSuccess'));
      } else {
        await adminAPI.createTag({ name: formName.trim(), color: formColor, is_active: true });
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

  const columns: Column<Tag>[] = [
    { key: 'name', title: t('admin.tags.nameLabel'), sortable: true },
    {
      key: 'color',
      title: '颜色',
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
        <span style={{
          padding: '2px 8px', borderRadius: 2, fontSize: 12,
          background: val ? '#e8f5e9' : '#eee',
          color: val ? '#2e7d32' : '#999',
        }}>
          {val ? t('admin.tags.enabled') : t('admin.tags.disabled')}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: t('admin.tags.createdAt'),
      width: '180px',
      render: (val) => (
        <span style={{ color: '#999' }}>{val ? new Date(String(val)).toLocaleString('zh-CN') : '-'}</span>
      ),
    },
    {
      key: 'actions',
      title: t('admin.tags.actions'),
      width: '120px',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {isSuperUser && (
            <button
              style={{ padding: '4px 10px', fontSize: 12, border: '1px solid ${Color.border.medium}', background: '#fff', color: '#666', borderRadius: 2, cursor: 'pointer' }}
              onClick={() => openEdit(record)}
            >
              {t('admin.tags.edit')}
            </button>
          )}
          {isSuperUser && (
            <button
              style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', borderRadius: 2, cursor: 'pointer' }}
              onClick={() => setDeleteTarget(record)}
            >
              {t('admin.tags.delete')}
            </button>
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
        actions={isSuperUser ? <PrimaryBtn onClick={openCreate}>{t('admin.tags.createTag')}</PrimaryBtn> : null}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder={t('admin.tags.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ height: 32, padding: '0 10px', fontSize: 13, border: '1px solid ${Color.border.medium}', borderRadius: 2, width: 200, outline: 'none' }}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        onRetry={fetchTags}
        emptyTitle={t('admin.tags.noTags')}
        emptyIcon="tags"
        rowKey="id"
      />

      {showForm && (
        <FormOverlay onClick={() => setShowForm(false)}>
          <FormDialog onClick={(e) => e.stopPropagation()}>
            <FormTitle>{editingId ? t('admin.tags.editTag') : t('admin.tags.newTag')}</FormTitle>
            <FormGroup>
              <Label>{t('admin.tags.nameLabel')}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('admin.tags.namePlaceholder')} />
            </FormGroup>
            <FormGroup>
              <Label>标签颜色 <ColorPreview $color={formColor}>{formColor}</ColorPreview></Label>
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
            <ButtonGroup>
              <SecondaryBtn onClick={() => setShowForm(false)}>{t('common.cancel')}</SecondaryBtn>
              <PrimaryBtn onClick={handleSave}>{editingId ? t('admin.tags.save') : t('admin.tags.create')}</PrimaryBtn>
            </ButtonGroup>
          </FormDialog>
        </FormOverlay>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('admin.tags.deleteTag')}
          message={t('admin.tags.confirmDeleteTag').replace('{name}', deleteTarget.name)}
          confirmLabel={t('admin.tags.confirmDelete')}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}