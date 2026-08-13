// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition, FocusRing } from '../../theme/tokens';
import PageHeader from '../../components/admin/common/PageHeader';
import DataTable from '../../components/admin/common/DataTable';
import type { Column } from '../../components/admin/common/DataTable';
import ConfirmDialog from '../../components/admin/common/ConfirmDialog';
import FormDialog from '../../components/admin/common/FormDialog';
import { adminAPI } from '../../api/admin';
import { useTranslation } from '../../i18n';
import { useAdminAuth } from '../../store/AdminAuthContext';

interface AdminGroup {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  member_count?: number;
}

interface GroupMember {
  id: number;
  username: string;
  role: 'leader' | 'member';
}

/* ========== Toast ========== */

const toastIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: ${Spacing.lg}px;
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)')};
  color: ${({ $type }) => ($type === 'success' ? Color.status.success : Color.status.error)};
  border: 1px solid ${({ $type }) => ($type === 'success' ? 'rgba(5, 150, 105, 0.25)' : 'rgba(220, 38, 38, 0.25)')};
  animation: ${toastIn} ${Transition.normal};
`;

/* ========== Form Fields ========== */

const FormGroup = styled.div`
  margin-bottom: ${Spacing.lg}px;
`;

const Label = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  height: 38px;
  padding: 0 ${Spacing.sm}px;
  font-size: ${FontSize.base}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: ${FocusRing.style};
  }
`;

const Hint = styled.span`
  display: block;
  margin-top: 4px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`;

const ErrorText = styled.span`
  display: block;
  margin-top: 4px;
  font-size: ${FontSize.xs}px;
  color: ${Color.status.error};
`;

/* Primary action button (brand blue) — used in page header */
const PrimaryBtn = styled.button`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: ${Color.primary};
  color: ${Color.text.inverse};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: background ${Transition.fast}, box-shadow ${Transition.fast};

  &:hover {
    background: ${Color.primaryHover};
    box-shadow: ${Shadow.focus};
  }
`;

/* ========== Member Panel ========== */

const MemberPanel = styled.div`
  margin-top: ${Spacing.lg}px;
  margin-bottom: ${Spacing.lg}px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  overflow: hidden;
  box-shadow: ${Shadow.card};
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

const RoleBadge = styled.span<{ $role: 'leader' | 'member' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${Radius.xs}px;
  font-size: ${FontSize.xs}px;
  font-weight: ${500};
  background: ${({ $role }) => ($role === 'leader' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(37, 99, 235, 0.12)')};
  color: ${({ $role }) => ($role === 'leader' ? Color.status.warning : Color.status.info)};
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

const AddMemberInput = styled.input`
  width: 160px;
  height: 32px;
  padding: 0 8px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: ${FocusRing.style};
  }

  &::placeholder {
    color: ${Color.text.muted};
  }
`;

const AddMemberBtn = styled.button<{ $disabled?: boolean }>`
  padding: 4px 12px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${Color.primary};
  background: ${Color.bg.card};
  color: ${Color.primary};
  border-radius: ${Radius.sm}px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition: background ${Transition.fast}, color ${Transition.fast};

  &:hover {
    background: ${({ $disabled }) => ($disabled ? 'transparent' : Color.primary)};
    color: ${({ $disabled }) => ($disabled ? Color.primary : Color.text.inverse)};
  }
`;

const RoleSelect = styled.select`
  height: 32px;
  padding: 0 6px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  color: ${Color.text.body};
  box-sizing: border-box;
  background: ${Color.bg.card};
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: ${FocusRing.style};
  }
`;

const RemoveBtn = styled.button`
  padding: 2px 8px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${Color.status.error};
  background: ${Color.bg.card};
  color: ${Color.status.error};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: background ${Transition.fast}, color ${Transition.fast};

  &:hover {
    background: ${Color.status.error};
    color: ${Color.text.inverse};
  }
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

const RetrySmallBtn = styled.button`
  margin-top: 8px;
  padding: 4px 12px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${Color.status.error};
  background: ${Color.bg.card};
  color: ${Color.status.error};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: background ${Transition.fast}, color ${Transition.fast};

  &:hover {
    background: ${Color.status.error};
    color: ${Color.text.inverse};
  }
`;

/* ========== Main Component ========== */

export default function AdminGroups() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAdminAuth();
  // Group list state
  const [groups, setGroups] = useState<AdminGroup[]>([]);
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
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<AdminGroup | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await adminAPI.getAdminGroups();
      const list = Array.isArray(data) ? data : (data.items || data.results || []);
      setGroups(list);
    } catch (err: any) {
      setError(err.message || t('admin.groups.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

  const handleCreate = async () => {
    const name = formName.trim();
    const slug = formSlug.trim();
    const errs: { name?: string; slug?: string } = {};
    if (!name) errs.name = t('admin.groups.nameRequired');
    else if (name.length > 100) errs.name = t('admin.groups.nameTooLong');
    if (!slug) errs.slug = t('admin.groups.slugRequired');
    else if (!SLUG_RE.test(slug)) errs.slug = t('admin.groups.slugFormat');
    else if (slug.length > 100) errs.slug = t('admin.groups.slugTooLong');
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await adminAPI.createAdminGroup({ name, slug });
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
      const data: any = await adminAPI.getGroupMembers(groupId);
      const list = Array.isArray(data) ? data : data.members || [];
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
    const trimmed = addMemberUserId.trim();
    if (!trimmed) {
      showMsg('error', t('admin.groups.userIdRequired'));
      return;
    }
    const userId = parseInt(trimmed, 10);
    if (isNaN(userId) || userId <= 0) {
      showMsg('error', t('admin.groups.userIdInvalid'));
      return;
    }
    try {
      setAddingMember(true);
      // 超管可选择角色（组长/普通管理员）；组长仅能添加本队普通成员
      const role = isSuperAdmin ? addMemberRole : 'member';
      await adminAPI.addGroupMember(expandedGroupId, { user_id: userId, role });
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
      await adminAPI.removeGroupMember(removeMemberGroupId, removeMemberTarget.id);
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
      await adminAPI.deleteGroup(deleteGroupTarget.id);
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

  const columns: Column<AdminGroup>[] = [
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
      width: '120px',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <ExpandBtn onClick={() => handleExpand(record.id)}>
            {expandedGroupId === record.id ? t('admin.groups.hideMembers') : t('admin.groups.viewMembers')}
          </ExpandBtn>
          <RemoveBtn onClick={() => {
            if (record.slug === 'pending') {
              showMsg('error', t('admin.groups.defaultGroupProtected'));
              return;
            }
            setDeleteGroupTarget(record);
          }}>
            {t('admin.groups.delete')}
          </RemoveBtn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('admin.groups.title')}
        breadcrumb={[{ label: t('admin.groups.subtitle') }, { label: t('admin.groups.title') }]}
        actions={<PrimaryBtn onClick={openCreate}>{t('admin.groups.createGroup')}</PrimaryBtn>}
      />

      {toast && <Toast $type={toast.type}>{toast.msg}</Toast>}

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

      {/* ====== Member Panel ====== */}
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
              <RetrySmallBtn onClick={() => fetchMembers(expandedGroupId)}>
                {t('admin.groups.retry')}
              </RetrySmallBtn>
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
                      <RemoveBtn
                        onClick={() => {
                          setRemoveMemberTarget(m);
                          setRemoveMemberGroupId(expandedGroupId);
                        }}
                      >
                        {t('admin.groups.remove')}
                      </RemoveBtn>
                    </MemberTd>
                  </MemberTr>
                ))}
              </tbody>
            </MemberTable>
          )}

          {/* Add member row */}
          <AddMemberRow>
            <AddMemberLabel>{t('admin.groups.addMember')}</AddMemberLabel>
            {isSuperAdmin && (
              <RoleSelect
                value={addMemberRole}
                onChange={(e) => setAddMemberRole(e.target.value as 'leader' | 'member')}
                title={t('admin.groups.addMemberRoleTitle')}
              >
                <option value="member">{t('admin.groups.roleMember')}</option>
                <option value="leader">{t('admin.groups.roleLeader')}</option>
              </RoleSelect>
            )}
            <AddMemberInput
              type="text"
              placeholder={t('admin.groups.addMemberPlaceholder')}
              value={addMemberUserId}
              onChange={(e) => setAddMemberUserId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMember();
              }}
            />
            <AddMemberBtn
              onClick={handleAddMember}
              $disabled={addingMember}
            >
              {addingMember ? t('admin.groups.adding') : t('admin.groups.add')}
            </AddMemberBtn>
          </AddMemberRow>
        </MemberPanel>
      )}

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
          message={t('admin.groups.confirmRemoveMember').replace('{group}', expandedGroup?.name || '').replace('{user}', removeMemberTarget.username || String(removeMemberTarget.id))}
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
        const memberCount = deleteGroupTarget.member_count || 0;
        const deleteMsg = memberCount > 0
          ? t('admin.groups.confirmDeleteGroupWithMembers')
              .replace('{name}', deleteGroupTarget.name)
              .replace('{count}', String(memberCount))
              .replace('{target}', t('admin.groups.pendingGroupName'))
          : t('admin.groups.confirmDeleteGroup').replace('{name}', deleteGroupTarget.name);
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
      })()}
    </div>
  );
}
