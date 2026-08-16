// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import PageHeader from '../../components/admin/common/PageHeader';
import DataTable from '../../components/admin/common/DataTable';
import type { Column } from '../../components/admin/common/DataTable';
import ConfirmDialog from '../../components/admin/common/ConfirmDialog';
import FormDialog from '../../components/admin/common/FormDialog';
import { useTranslation } from '../../i18n';
import { useAdminAuth } from '../../store/AdminAuthContext';
import {
  useAdminGroupRepository,
  AdminGroupRepositoryProvider,
} from '../../repositories/AdminGroupRepositoryContext';
import type { AdminGroupItem, GroupMember } from '../../repositories/AdminGroupRepository';
import {
  validateGroupForm,
  composeDeleteConfirmMessage,
  validateAddMemberInput,
  composeRemoveMemberConfirmMessage,
} from '../../domain/adminGroups';
import { PrimaryBtn, DangerBtn, OutlinePrimaryBtn, Input, Select, FormGroup, Label, Hint, ErrorText, RoleBadge, Toast } from '../../components/admin/common/ui';

/* ========== Member Panel ========== */

const MemberPanel = styled.div`
  width: 400px;
  flex-shrink: 0;
  max-height: 72vh;
  overflow-y: auto;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};

  @media (max-width: 1024px) {
    width: 100%;
    max-height: none;
  }
`;

const MemberPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${Spacing.md}px ${Spacing.lg}px;
  background: ${Color.primaryLight};
  border-bottom: 1px solid ${Color.border.light};
`;

const MemberPanelTitle = styled.span`
  font-size: ${FontSize.base}px;
  font-weight: ${600};
  color: ${Color.primaryHover};
`;

const MemberPanelClose = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  color: ${Color.text.muted};
  cursor: pointer;
  padding: 0;
  line-height: 1;
  border-radius: ${Radius.xs}px;
  transition: color ${Transition.fast}, background ${Transition.fast};

  &:hover {
    color: ${Color.primaryHover};
    background: rgba(26, 86, 219, 0.1);
  }
`;

const MemberTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const MemberThead = styled.thead`
  background: rgba(26, 86, 219, 0.04);
`;

const MemberTh = styled.th`
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  text-align: left;
  font-weight: ${500};
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  border-bottom: 1px solid ${Color.border.light};
`;

const MemberTd = styled.td`
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  border-bottom: 1px solid ${Color.border.light};
`;

const MemberTr = styled.tr`
  transition: background ${Transition.fast};

  &:hover {
    background: ${Color.primaryLight};
  }
`;

const AddMemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.sm}px;
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  border-top: 1px solid ${Color.border.light};
`;

const AddMemberLabel = styled.span`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
`;

const ExpandBtn = styled.button`
  padding: 4px 10px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: border-color ${Transition.fast}, color ${Transition.fast};

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }
`;

const MemberLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${Spacing.xxxl}px ${Spacing.lg}px;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`;

const MemberEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${Spacing.xxxl}px ${Spacing.lg}px;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`;

const MemberError = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${Spacing.xl}px ${Spacing.lg}px;
  color: ${Color.status.error};
  font-size: ${FontSize.sm}px;
`;

/* ========== Main Component ========== */

export default function AdminGroups() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAdminAuth();
  const groupRepo = useAdminGroupRepository();
  // Group list state
  const [groups, setGroups] = useState<AdminGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string }>({});

  // Member expansion state
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Add member state
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'leader' | 'member'>('member');
  const [addingMember, setAddingMember] = useState(false);

  // Remove member confirmation state
  const [removeMemberTarget, setRemoveMemberTarget] = useState<GroupMember | null>(null);
  const [removeMemberGroupId, setRemoveMemberGroupId] = useState<number | null>(null);

  // Delete group confirmation state
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<AdminGroupItem | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await groupRepo.listGroups();
      setGroups(list);
    } catch (err: any) {
      setError(err.message || t('admin.groups.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t, groupRepo]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Create Group ---- */

  const openCreate = () => {
    setFormName('');
    setFormSlug('');
    setFormErrors({});
    setShowForm(true);
  };

  const handleCreate = async () => {
    const name = formName.trim();
    const slug = formSlug.trim();
    const rawErrs = validateGroupForm(formName, formSlug);
    const errs: { name?: string; slug?: string } = {
      name: rawErrs.name ? t(rawErrs.name) : undefined,
      slug: rawErrs.slug ? t(rawErrs.slug) : undefined,
    };
    setFormErrors(errs);
    if (Object.keys(errs).some((k) => errs[k as keyof typeof errs])) return;
    try {
      await groupRepo.createGroup({ name, slug });
      showMsg('success', t('admin.groups.createSuccess'));
      setShowForm(false);
      fetchGroups();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.createFailed'));
    }
  };

  /* ---- Members ---- */

  const fetchMembers = async (groupId: number) => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const list = await groupRepo.listMembers(groupId);
      setMembers(list);
    } catch (err: any) {
      setMembersError(err.message || t('admin.groups.loadMembersFailed'));
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleExpand = (groupId: number) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setMembers([]);
      setAddMemberUserId('');
    } else {
      setExpandedGroupId(groupId);
      setAddMemberUserId('');
      fetchMembers(groupId);
    }
  };

  const handleAddMember = async () => {
    if (!expandedGroupId) return;
    const res = validateAddMemberInput({
      rawUserId: addMemberUserId,
      isSuperAdmin,
      selectedRole: addMemberRole,
    });
    if (!res.ok) {
      showMsg('error', t(res.errorKey!));
      return;
    }
    try {
      setAddingMember(true);
      await groupRepo.addMember(expandedGroupId, { user_id: res.userId!, role: res.role });
      showMsg('success', t('admin.groups.memberAdded'));
      setAddMemberUserId('');
      fetchMembers(expandedGroupId);
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.addMemberFailed'));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberTarget || removeMemberGroupId === null) return;
    try {
      await groupRepo.removeMember(removeMemberGroupId, removeMemberTarget.id);
      showMsg('success', t('admin.groups.memberRemoved'));
      setRemoveMemberTarget(null);
      setRemoveMemberGroupId(null);
      fetchMembers(removeMemberGroupId);
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.removeMemberFailed'));
      setRemoveMemberTarget(null);
      setRemoveMemberGroupId(null);
    }
  };

  /* ---- Delete Group ---- */

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    try {
      await groupRepo.deleteGroup(deleteGroupTarget.id);
      showMsg('success', t('admin.groups.groupDeleted'));
      setDeleteGroupTarget(null);
      if (expandedGroupId === deleteGroupTarget.id) {
        setExpandedGroupId(null);
        setMembers([]);
      }
      fetchGroups();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.deleteGroupFailed'));
      setDeleteGroupTarget(null);
    }
  };

  const expandedGroup = groups.find((group) => group.id === expandedGroupId);

  /* ---- Columns ---- */

  const columns: Column<AdminGroupItem>[] = [
    { key: 'name', title: t('admin.groups.columnName'), sortable: true },
    { key: 'slug', title: t('admin.groups.columnSlug'), sortable: true },
    {
      key: 'created_at',
      title: t('admin.groups.columnCreatedAt'),
      width: '180px',
      render: (val) => (
        <span style={{ color: Color.text.muted }}>
          {val ? new Date(String(val)).toLocaleString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('admin.groups.columnActions'),
      width: '240px',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
          <ExpandBtn onClick={() => handleExpand(record.id)}>
            {expandedGroupId === record.id ? t('admin.groups.hideMembers') : t('admin.groups.viewMembers')}
          </ExpandBtn>
          <DangerBtn onClick={() => {
            if (record.slug === 'pending') {
              showMsg('error', t('admin.groups.defaultGroupProtected'));
              return;
            }
            setDeleteGroupTarget(record);
          }}>
            {t('admin.groups.delete')}
          </DangerBtn>
        </div>
      ),
    },
  ];

  return (
    <AdminGroupRepositoryProvider>
    <div>
      <PageHeader
        title={t('admin.groups.title')}
        breadcrumb={[{ label: t('admin.groups.subtitle') }, { label: t('admin.groups.title') }]}
        actions={<PrimaryBtn onClick={openCreate}>{t('admin.groups.createGroup')}</PrimaryBtn>}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <DataTable
            columns={columns}
            data={groups}
            loading={loading}
            error={error}
            onRetry={fetchGroups}
            emptyTitle={t('admin.groups.noGroups')}
            emptyIcon="groups"
            rowKey="id"
          />
        </div>

        {/* ====== Member Panel (right side) ====== */}
        {expandedGroupId !== null && !loading && !error && (
          <MemberPanel>
          <MemberPanelHeader>
            <MemberPanelTitle>
              {expandedGroup ? expandedGroup.name : ''}{t('admin.groups.memberListTitle')}
            </MemberPanelTitle>
            <MemberPanelClose
              onClick={() => {
                setExpandedGroupId(null);
                setMembers([]);
              }}
            >
              &times;
            </MemberPanelClose>
          </MemberPanelHeader>

          {/* Members loading */}
          {membersLoading && <MemberLoading>{t('admin.groups.loadingMembers')}</MemberLoading>}

          {/* Members error */}
          {membersError && !membersLoading && (
            <MemberError>
              <span>{membersError}</span>
              <DangerBtn style={{ marginTop: 8 }} onClick={() => fetchMembers(expandedGroupId)}>
                {t('admin.groups.retry')}
              </DangerBtn>
            </MemberError>
          )}

          {/* Members empty */}
          {!membersLoading && !membersError && members.length === 0 && (
            <MemberEmpty>
              <span style={{ marginBottom: 4 }}>{t('admin.groups.noMembers')}</span>
              <span style={{ fontSize: FontSize.xs, color: Color.text.muted }}>{t('admin.groups.addMemberHint')}</span>
            </MemberEmpty>
          )}

          {/* Members table */}
          {!membersLoading && !membersError && members.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
            <MemberTable>
              <MemberThead>
                <tr>
                  <MemberTh>{t('admin.groups.columnUserId')}</MemberTh>
                  <MemberTh>{t('admin.groups.columnUsername')}</MemberTh>
                  <MemberTh>{t('admin.groups.columnRole')}</MemberTh>
                  <MemberTh>{t('admin.groups.columnActions')}</MemberTh>
                </tr>
              </MemberThead>
              <tbody>
                {members.map((m) => (
                  <MemberTr key={m.id}>
                    <MemberTd>{m.id}</MemberTd>
                    <MemberTd>{m.username || '-'}</MemberTd>
                    <MemberTd>
                      <RoleBadge $role={m.role}>
                        {m.role === 'leader' ? t('admin.groups.roleLeader') : t('admin.groups.roleMember')}
                      </RoleBadge>
                    </MemberTd>
                    <MemberTd>
                      <DangerBtn
                        onClick={() => {
                          setRemoveMemberTarget(m);
                          setRemoveMemberGroupId(expandedGroupId);
                        }}
                      >
                        {t('admin.groups.remove')}
                      </DangerBtn>
                    </MemberTd>
                  </MemberTr>
                ))}
              </tbody>
            </MemberTable>
            </div>
          )}

          {/* Add member row */}
          <AddMemberRow>
            <AddMemberLabel>{t('admin.groups.addMember')}</AddMemberLabel>
            {isSuperAdmin && (
              <Select
                value={addMemberRole}
                onChange={(e) => setAddMemberRole(e.target.value as 'leader' | 'member')}
                title={t('admin.groups.addMemberRoleTitle')}
              >
                <option value="member">{t('admin.groups.roleMember')}</option>
                <option value="leader">{t('admin.groups.roleLeader')}</option>
              </Select>
            )}
            <Input
              $compact
              style={{ width: 160 }}
              type="text"
              placeholder={t('admin.groups.addMemberPlaceholder')}
              value={addMemberUserId}
              onChange={(e) => setAddMemberUserId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMember();
              }}
            />
            <OutlinePrimaryBtn
              onClick={handleAddMember}
              $disabled={addingMember}
            >
              {addingMember ? t('admin.groups.adding') : t('admin.groups.add')}
            </OutlinePrimaryBtn>
          </AddMemberRow>
        </MemberPanel>
        )}
      </div>

      {/* ====== Create Form Dialog (reuses common FormDialog) ====== */}
      <FormDialog
        open={showForm}
        title={t('admin.groups.newGroup')}
        submitLabel={t('admin.groups.create')}
        cancelLabel={t('common.cancel')}
        submitVariant="primary"
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
      >
        <FormGroup>
          <Label>{t('admin.groups.nameLabel')}</Label>
          <Input
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value);
              if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder={t('admin.groups.namePlaceholder')}
          />
          {formErrors.name && <ErrorText>{formErrors.name}</ErrorText>}
        </FormGroup>
        <FormGroup>
          <Label>{t('admin.groups.slugLabel')}</Label>
          <Input
            value={formSlug}
            onChange={(e) => {
              setFormSlug(e.target.value);
              if (formErrors.slug) setFormErrors((p) => ({ ...p, slug: undefined }));
            }}
            placeholder={t('admin.groups.slugPlaceholder')}
          />
          <Hint>{t('admin.groups.slugHint')}</Hint>
          {formErrors.slug && <ErrorText>{formErrors.slug}</ErrorText>}
        </FormGroup>
      </FormDialog>

      {/* ====== Remove Member Confirmation ====== */}
      {removeMemberTarget && removeMemberGroupId !== null && (
        <ConfirmDialog
          title={t('admin.groups.removeMember')}
          message={composeRemoveMemberConfirmMessage({
            groupName: expandedGroup?.name || '',
            username: removeMemberTarget.username || String(removeMemberTarget.id),
            t,
          })}
          confirmLabel={t('admin.groups.confirmRemove')}
          danger
          onConfirm={handleRemoveMember}
          onCancel={() => {
            setRemoveMemberTarget(null);
            setRemoveMemberGroupId(null);
          }}
        />
      )}

      {/* ====== Delete Group Confirmation ====== */}
      {deleteGroupTarget && (() => {
        const deleteMsg = composeDeleteConfirmMessage({
          name: deleteGroupTarget.name,
          memberCount: deleteGroupTarget.member_count || 0,
          t,
        });
        return (
          <ConfirmDialog
            title={t('admin.groups.deleteGroup')}
            message={deleteMsg}
            confirmLabel={t('admin.groups.confirmDelete')}
            danger
            onConfirm={handleDeleteGroup}
            onCancel={() => setDeleteGroupTarget(null)}
          />
        );
      })(      )}
    </div>
    </AdminGroupRepositoryProvider>
  );
}
