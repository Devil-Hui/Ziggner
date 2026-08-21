import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import { Input, Select, SecondaryBtn, DangerBtn, PrimaryBtn } from '../../components/admin/common/ui';
import PageHeader from '../../components/admin/common/PageHeader';
import LoadingSkeleton from '../../components/admin/common/LoadingSkeleton';
import ErrorRetry from '../../components/admin/common/ErrorRetry';
import EmptyState from '../../components/admin/common/EmptyState';
import ConfirmDialog from '../../components/admin/common/ConfirmDialog';
import { adminAPI } from '../../api/admin';
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTranslation } from '../../i18n';

interface CategoryNode {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
  is_active: boolean;
  children: CategoryNode[];
}

const Container = styled.div`
  display: flex;
  gap: 24px;
`;

const TreePanel = styled.div`
  flex: 1;
  max-width: 360px;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
`;

const TreeTitle = styled.div`
  padding: 12px 16px;
  font-size: ${FontSize.base}px;
  font-weight: 600;
  color: ${Color.text.heading};
  border-bottom: 1px solid ${Color.border.light};
`;

const TreeList = styled.div`
  padding: 8px 0;
`;

const TreeNode = styled.div<{ $level: number; $active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 16px 8px ${({ $level }) => 16 + $level * 20}px;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $active }) => ($active ? '#f5f5f5' : 'transparent')};
  border-left: 3px solid ${({ $active }) => ($active ? Color.primary : 'transparent')};

  &:hover {
    background: ${({ $active }) => ($active ? '#f5f5f5' : '#f5f5f5')};
  }
`;

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  width: 16px;
  font-size: 10px;
  color: ${Color.text.muted};
  margin-right: 4px;
  flex-shrink: 0;
  transform: ${({ $expanded }) => ($expanded ? 'rotate(90deg)' : 'rotate(0)')};
  transition: transform 0.15s;
`;

const NodeName = styled.span<{ $inactive?: boolean }>`
  font-size: ${FontSize.sm}px;
  color: ${({ $inactive }) => ($inactive ? '#ccc' : '#333')};
  flex: 1;
`;

const LevelTag = styled.span`
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 2px;
  background: ${Color.border.light};
  color: ${Color.text.muted};
  margin-left: 8px;
`;

const DetailPanel = styled.div`
  flex: 2;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  padding: ${Spacing.xxl}px;
`;

const DetailTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0 0 16px 0;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: ${FontSize.sm}px;
`;

const DetailLabel = styled.span`
  width: 80px;
  color: ${Color.text.muted};
  flex-shrink: 0;
`;

const DetailValue = styled.span`
  color: ${Color.primaryHover};
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 20px;
`;

const MigrateSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${Color.border.light};
`;

const MigrateTitle = styled.h4`
  font-size: ${FontSize.base}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0 0 12px 0;
`;

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
`;

export default function AdminCategories() {
  const { t } = useTranslation();
  const { adminUser } = useAdminAuth()
  const isSuperUser = adminUser?.is_superuser ?? false
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CategoryNode | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form state
  const [mode, setMode] = useState<'view' | 'create' | 'edit' | 'migrate'>('view');
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formLevel, setFormLevel] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [formAdminGroupId, setFormAdminGroupId] = useState<number | null>(null);
  const [adminGroups, setAdminGroups] = useState<{ id: number; name: string }[]>([]);
  const [migrateFromId, setMigrateFromId] = useState<number | null>(null);
  const [migrateToId, setMigrateToId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // 组范围子树：无权限的类目（其他管理组）后端直接不返回
      const data = await adminAPI.getCategorySubtree();
      setTree(data as unknown as CategoryNode[]);
    } catch (err: any) {
      setError(err.message || t('admin.categories.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    adminAPI.getAdminGroups()
      .then((res) => setAdminGroups(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectNode = (node: CategoryNode & { admin_group_id?: number }) => {
    setSelected(node);
    setMode('view');
    setFormName(node.name);
    setFormParentId(node.parent_id);
    setFormLevel(node.level);
    setFormActive(node.is_active);
    setFormAdminGroupId(node.admin_group_id || null);
  };

  const handleCreate = () => {
    setSelected(null);
    setMode('create');
    setFormName('');
    setFormParentId(null);
    setFormLevel(1);
    setFormActive(true);
    setFormAdminGroupId(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('error', t('admin.categories.nameRequired'));
      return;
    }
    try {
      if (mode === 'create') {
        await adminAPI.createCategory({
          name: formName.trim(),
          parent_id: formParentId,
          level: formLevel,
          admin_group_id: formAdminGroupId || undefined,
        });
        showToast('success', t('admin.categories.createSuccess'));
      } else if (mode === 'edit' && selected) {
        await adminAPI.updateCategory(selected.id, {
          name: formName.trim(),
          is_active: formActive,
          admin_group_id: formAdminGroupId || undefined,
        });
        showToast('success', t('admin.categories.updateSuccess'));
      }
      fetchTree();
      setMode('view');
    } catch (err: any) {
      showToast('error', err.message || t('admin.categories.operationFailed'));
    }
  };

  const { execute: debouncedSave, isPending: isSaving } = useDebounceSubmit(handleSave, 800);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await adminAPI.deleteCategory(selected.id);
      showToast('success', t('admin.categories.deleteSuccess'));
      setSelected(null);
      setShowDeleteConfirm(false);
      fetchTree();
    } catch (err: any) {
      showToast('error', err.message || t('admin.categories.deleteFailed'));
      setShowDeleteConfirm(false);
    }
  };

  const handleMigrate = async () => {
    if (!migrateFromId || !migrateToId) {
      showToast('error', t('admin.categories.selectSourceTarget'));
      return;
    }
    try {
      const result = await adminAPI.migrateCategory({
        from_category_id: migrateFromId,
        to_category_id: migrateToId,
      });
      showToast('success', t('admin.categories.migrateSuccess').replace('{count}', String(result.migrated_count)));
      setMode('view');
      fetchTree();
    } catch (err: any) {
      showToast('error', err.message || t('admin.categories.migrateFailed'));
    }
  };

  const getFlatNodes = (nodes: CategoryNode[], level = 0): CategoryNode[] => {
    return nodes.flatMap((n) => [n, ...getFlatNodes(n.children || [], level + 1)]);
  };

  const renderNode = (node: CategoryNode, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selected?.id === node.id;

    return (
      <div key={node.id}>
        <TreeNode
          $level={level}
          $active={isSelected}
          onClick={() => selectNode(node)}
        >
          {hasChildren ? (
            <ExpandIcon
              $expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              ▶
            </ExpandIcon>
          ) : (
            <span style={{ width: 20, flexShrink: 0 }} />
          )}
          <NodeName $inactive={!node.is_active}>{node.name}</NodeName>
          <LevelTag>L{node.level}</LevelTag>
        </TreeNode>
        {hasChildren && isExpanded && node.children.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  const allNodes = getFlatNodes(tree);

  return (
    <div>
      <PageHeader
        title={t('admin.categories.title')}
        breadcrumb={[{ label: t('admin.categories.subtitle') }, { label: t('admin.categories.title') }]}
        actions={
          isSuperUser ? <PrimaryBtn onClick={handleCreate}>{t('admin.categories.createCategory')}</PrimaryBtn> : null
        }
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      {loading ? (
        <LoadingSkeleton type="card" rows={8} />
      ) : error ? (
        <ErrorRetry message={t('admin.categories.loadError')} detail={error} onRetry={fetchTree} />
      ) : tree.length === 0 ? (
        <EmptyState title={t('admin.categories.noCategories')} icon="categories" />
      ) : (
        <Container>
          <TreePanel>
            <TreeTitle>{t('admin.categories.tree')}</TreeTitle>
            <TreeList>{tree.map((node) => renderNode(node))}</TreeList>
          </TreePanel>

          <DetailPanel>
            {mode === 'view' && selected ? (
              <>
                <DetailTitle>{t('admin.categories.detail')}</DetailTitle>
                <DetailRow>
                  <DetailLabel>{t('admin.categories.nameLabel')}</DetailLabel>
                  <DetailValue>{selected.name}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>{t('admin.categories.level')}</DetailLabel>
                  <DetailValue>{t('admin.categories.levelN').replace('{level}', String(selected.level))}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>{t('admin.categories.statusLabel')}</DetailLabel>
                  <DetailValue>{selected.is_active ? t('admin.categories.enabled') : t('admin.categories.disabled')}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>{t('admin.categories.childCountLabel')}</DetailLabel>
                  <DetailValue>{t('admin.categories.childCount').replace('{count}', String(selected.children?.length || 0))}</DetailValue>
                </DetailRow>
                <ButtonGroup>
                  {isSuperUser && <SecondaryBtn onClick={() => setMode('edit')}>{t('common.edit')}</SecondaryBtn>}
                  {isSuperUser && <DangerBtn onClick={() => setShowDeleteConfirm(true)}>{t('common.delete')}</DangerBtn>}
                  {isSuperUser && selected.level === 2 && (
                    <SecondaryBtn onClick={() => { setMode('migrate'); setMigrateFromId(selected.id); }}>
                      {t('admin.categories.migrateProducts')}
                    </SecondaryBtn>
                  )}
                </ButtonGroup>
              </>
            ) : mode === 'edit' && selected ? (
              <>
                <DetailTitle>{t('admin.categories.editCategory')}</DetailTitle>
                <FormGroup>
                  <Label>{t('admin.categories.nameLabel')}</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.categories.statusLabel')}</Label>
                  <Select value={formActive ? '1' : '0'} onChange={(e) => setFormActive(e.target.value === '1')}>
                    <option value="1">{t('admin.categories.enabled')}</option>
                    <option value="0">{t('admin.categories.disabled')}</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.categories.adminGroup')}</Label>
                  <Select
                    value={formAdminGroupId || ''}
                    onChange={(e) => setFormAdminGroupId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{t('admin.categories.noGroup')}</option>
                    {adminGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </Select>
                </FormGroup>
                <ButtonGroup>
                  <PrimaryBtn onClick={debouncedSave} disabled={isSaving}>{isSaving ? t('common.saving') : t('common.save')}</PrimaryBtn>
                  <SecondaryBtn onClick={() => setMode('view')}>{t('common.cancel')}</SecondaryBtn>
                </ButtonGroup>
              </>
            ) : mode === 'create' ? (
              <>
                <DetailTitle>{t('admin.categories.newCategory')}</DetailTitle>
                <FormGroup>
                  <Label>{t('admin.categories.nameLabel')}</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('admin.categories.namePlaceholder')} />
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.categories.parentCategory')}</Label>
                  <Select
                    value={formParentId || ''}
                    onChange={(e) => {
                      const pid = e.target.value ? Number(e.target.value) : null;
                      setFormParentId(pid);
                      if (pid) {
                        const parent = allNodes.find((n) => n.id === pid);
                        setFormLevel(parent ? parent.level + 1 : 1);
                      } else {
                        setFormLevel(1);
                      }
                    }}
                  >
                    <option value="">{t('admin.categories.noParent')}</option>
                    {allNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {'  '.repeat(n.level - 1)}{n.name} (L{n.level})
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.categories.level')}</Label>
                  <Select
                    value={String(formLevel)}
                    onChange={(e) => setFormLevel(Number(e.target.value))}
                    disabled={!!formParentId}
                    title={formParentId ? t('admin.categories.levelAuto') : ''}
                  >
                    <option value="1">{t('admin.categories.level1')}</option>
                    <option value="2">{t('admin.categories.level2')}</option>
                    <option value="3">{t('admin.categories.level3')}</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>{t('admin.categories.adminGroup')}</Label>
                  <Select
                    value={formAdminGroupId || ''}
                    onChange={(e) => setFormAdminGroupId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{t('admin.categories.noGroup')}</option>
                    {adminGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </Select>
                </FormGroup>
                <ButtonGroup>
                  <PrimaryBtn onClick={handleSave}>{t('common.create')}</PrimaryBtn>
                  <SecondaryBtn onClick={() => setMode('view')}>{t('common.cancel')}</SecondaryBtn>
                </ButtonGroup>
              </>
            ) : mode === 'migrate' ? (
              <>
                <DetailTitle>{t('admin.categories.migrateProducts')}</DetailTitle>
                <MigrateSection>
                  <MigrateTitle>{t('admin.categories.migrateDesc')}</MigrateTitle>
                  <FormGroup>
                    <Label>{t('admin.categories.sourceCategory')}</Label>
                    <Select
                      value={migrateFromId || ''}
                      onChange={(e) => setMigrateFromId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">{t('admin.categories.selectSource')}</option>
                      {allNodes.filter((n) => n.level === 2).map((n) => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('admin.categories.targetCategory')}</Label>
                    <Select
                      value={migrateToId || ''}
                      onChange={(e) => setMigrateToId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">{t('admin.categories.selectTarget')}</option>
                      {allNodes.filter((n) => n.level === 3).map((n) => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  <ButtonGroup>
                    <PrimaryBtn onClick={handleMigrate}>{t('admin.categories.executeMigration')}</PrimaryBtn>
                    <SecondaryBtn onClick={() => setMode('view')}>{t('common.cancel')}</SecondaryBtn>
                  </ButtonGroup>
                </MigrateSection>
              </>
            ) : (
              <EmptyState title={t('admin.categories.selectCategory')} icon="select" />
            )}
          </DetailPanel>
        </Container>
      )}

      {showDeleteConfirm && selected && (
        <ConfirmDialog
          title={t('admin.categories.deleteCategory')}
          message={`${t('admin.categories.confirmDeleteCategory').replace('{name}', selected.name)}${selected.children?.length ? ' ' + t('admin.categories.hasChildrenError') : ''}`}
          confirmLabel={t('admin.categories.confirmDelete')}
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}