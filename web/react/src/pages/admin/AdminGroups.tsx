// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens';
import PageHeader from '../../components/admin/common/PageHeader';
import DataTable from '../../components/admin/common/DataTable';
import type { Column } from '../../components/admin/common/DataTable';
import ConfirmDialog from '../../components/admin/common/ConfirmDialog';
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

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
`;

/* ========== Form Dialog ========== */

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
  width: 420px;
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

const Hint = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: ${Color.text.muted};
`;

const ErrorText = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #c62828;
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

/* ========== Member Panel ========== */

const MemberPanel = styled.div`
  margin-top: 16px;
  margin-bottom: 16px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
`;

const MemberPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${Color.primaryLight};
  border-bottom: 1px solid ${Color.border.light};
`;

const MemberPanelTitle = styled.span`
  font-size: ${FontSize.base}px;
  font-weight: 600;
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

  &:hover {
    color: ${Color.primaryHover};
  }
`;

const MemberTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const MemberThead = styled.thead`
  background: rgba(26, 23, 18, 0.03);
`;

const MemberTh = styled.th`
  padding: 8px 16px;
  text-align: left;
  font-weight: 500;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  border-bottom: 1px solid ${Color.border.light};
`;

const MemberTd = styled.td`
  padding: 10px 16px;
  font-size: ${FontSize.sm}px;
  color: ${Color.primaryHover};
  border-bottom: 1px solid ${Color.border.light};
`;

const MemberTr = styled.tr`
  &:hover {
    background: ${Color.primaryLight};
  }
`;

const RoleBadge = styled.span<{ $role: 'leader' | 'member' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: ${FontSize.xs}px;
  font-weight: 500;
  background: ${({ $role }) => ($role === 'leader' ? '#fff3e0' : '#e3f2fd')};
  color: ${({ $role }) => ($role === 'leader' ? '#e65100' : '#1565c0')};
`;

const AddMemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid ${Color.border.light};
`;

const AddMemberLabel = styled.span`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
`;

const AddMemberInput = styled.input`
  width: 160px;
  height: 30px;
  padding: 0 8px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 2px;
  color: ${Color.primaryHover};
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #e74c3c;
  }

  &::placeholder {
    color: ${Color.border.dark};
  }
`;

const AddMemberBtn = styled.button<{ $disabled?: boolean }>`
  padding: 4px 12px;
  font-size: ${FontSize.xs}px;
  border: 1px solid #e74c3c;
  background: ${Color.bg.card};
  color: #e74c3c;
  border-radius: 2px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};

  &:hover {
    background: ${({ $disabled }) => ($disabled ? '#fff' : '#e74c3c')};
    color: ${({ $disabled }) => ($disabled ? '#e74c3c' : '#fff')};
  }
`;

const RoleSelect = styled.select`
  height: 30px;
  padding: 0 6px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 2px;
  color: ${Color.primaryHover};
  box-sizing: border-box;
  background: ${Color.bg.card};

  &:focus {
    outline: none;
    border-color: #e74c3c;
  }
`;

const RemoveBtn = styled.button`
  padding: 2px 8px;
  font-size: ${FontSize.xs}px;
  border: 1px solid #e74c3c;
  background: ${Color.bg.card};
  color: #e74c3c;
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    background: #e74c3c;
    color: ${Color.text.inverse};
  }
`;

const ExpandBtn = styled.button`
  padding: 4px 10px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: #e74c3c;
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    border-color: #e74c3c;
  }
`;

const MemberLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`;

const MemberEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`;

const MemberError = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: #c62828;
  font-size: ${FontSize.sm}px;
`;

const RetrySmallBtn = styled.button`
  margin-top: 8px;
  padding: 4px 12px;
  font-size: ${FontSize.xs}px;
  border: 1px solid #e74c3c;
  background: ${Color.bg.card};
  color: #e74c3c;
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    background: #e74c3c;
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
        <span style={{ color: '#999' }}>
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
              <span style={{ fontSize: 12, color: '#ccc' }}>{t('admin.groups.addMemberHint')}</span>
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

      {/* ====== Create Form Dialog ====== */}
      {showForm && (
        <FormOverlay onClick={() => setShowForm(false)}>
          <FormDialog onClick={(e) => e.stopPropagation()}>
            <FormTitle>{t('admin.groups.newGroup')}</FormTitle>
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
            <ButtonGroup>
              <SecondaryBtn onClick={() => setShowForm(false)}>{t('common.cancel')}</SecondaryBtn>
              <PrimaryBtn onClick={handleCreate}>{t('admin.groups.create')}</PrimaryBtn>
            </ButtonGroup>
          </FormDialog>
        </FormOverlay>
      )}

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