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
import { formatDateTime } from '../../utils/helpers';
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
import { adminAPI } from '../../api/admin';

// 创建组/管理员草稿：关闭弹窗保留已填内容（提交成功后清除；密码/用户名不入草稿——安全）
interface GroupFormDraft {
  tab: 'group' | 'admin';
  name: string;
  slug: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  phone: string;
  countryCode: string;
  role: string;
  isActive: boolean;
}
let groupDraft: GroupFormDraft | null = null;

/* ========== Member Panel ========== */

const MemberPanel = styled.div`
  width: 400px;
  flex-shrink: 0;
  max-height: 72vh;
  overflow-y: auto;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  position: sticky;
  top: 16px;

  @media (max-width: 1024px) {
    width: 100%;
    max-height: none;
    position: static;
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

const TabBtn = styled.button<{ $active?: boolean }>`
  padding: 6px 16px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${({ $active }) => ($active ? Color.primary : Color.border.medium)};
  background: ${({ $active }) => ($active ? Color.primary : Color.bg.card)};
  color: ${({ $active }) => ($active ? Color.text.inverse : Color.text.secondary)};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: border-color ${Transition.fast}, color ${Transition.fast}, background ${Transition.fast};

  &:hover {
    border-color: ${Color.primary};
    color: ${({ $active }) => ($active ? Color.text.inverse : Color.primary)};
  }
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

/* ========== Create-Admin form option data ========== */

const COUNTRY_OPTIONS: { value: string; key: string }[] = [
  { value: '', key: 'admin.groups.adminCountryCodeNone' },
  { value: '+86', key: 'admin.groups.adminCountryCodeCN' },
  { value: '+852', key: 'admin.groups.adminCountryCodeHK' },
  { value: '+853', key: 'admin.groups.adminCountryCodeMO' },
  { value: '+886', key: 'admin.groups.adminCountryCodeTW' },
  { value: '+1', key: 'admin.groups.adminCountryCodeUS' },
  { value: '+44', key: 'admin.groups.adminCountryCodeUK' },
  { value: '+81', key: 'admin.groups.adminCountryCodeJP' },
  { value: '+82', key: 'admin.groups.adminCountryCodeKR' },
  { value: '+65', key: 'admin.groups.adminCountryCodeSG' },
  { value: '+60', key: 'admin.groups.adminCountryCodeMY' },
  { value: '+66', key: 'admin.groups.adminCountryCodeTH' },
  { value: '+84', key: 'admin.groups.adminCountryCodeVN' },
  { value: '+62', key: 'admin.groups.adminCountryCodeID' },
  { value: '+91', key: 'admin.groups.adminCountryCodeIN' },
  { value: '+49', key: 'admin.groups.adminCountryCodeDE' },
  { value: '+33', key: 'admin.groups.adminCountryCodeFR' },
  { value: '+39', key: 'admin.groups.adminCountryCodeIT' },
  { value: '+7', key: 'admin.groups.adminCountryCodeRU' },
  { value: '+61', key: 'admin.groups.adminCountryCodeAU' },
  { value: '+971', key: 'admin.groups.adminCountryCodeAE' },
  { value: '+966', key: 'admin.groups.adminCountryCodeSA' },
];

const ROLE_OPTIONS: { value: 'ops' | 'superadmin' | 'admin_leader' | 'admin_member'; key: string }[] = [
  { value: 'ops', key: 'admin.groups.roleOps' },
  { value: 'superadmin', key: 'admin.groups.roleSuperadmin' },
  { value: 'admin_leader', key: 'admin.rbac.createAdminRoleLeader' },
  { value: 'admin_member', key: 'admin.rbac.createAdminRoleMember' },
];

// ── Toggle switch (is_active) ──
const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background: ${Color.primary};
  }

  &:checked + span::before {
    transform: translateX(18px);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  inset: 0;
  background: ${Color.border.dark};
  border-radius: 22px;
  cursor: pointer;
  transition: ${Transition.normal};

  &::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    left: 3px;
    bottom: 3px;
    background: ${Color.bg.card};
    border-radius: 50%;
    transition: transform 0.2s;
  }
`;

const ToggleLabel = styled.span`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
`;

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

  // Combined create dialog: active tab + admin-account form state
  const [createTab, setCreateTab] = useState<'group' | 'admin'>('group');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminCountryCode, setAdminCountryCode] = useState('');
  const [adminRole, setAdminRole] = useState<'ops' | 'superadmin' | 'admin_leader' | 'admin_member'>('ops');
  const [adminIsActive, setAdminIsActive] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [adminGroupSlug, setAdminGroupSlug] = useState('');
  const [adminGroupRole, setAdminGroupRole] = useState<'leader' | 'member'>('member');
  const [adminGroups, setAdminGroups] = useState<{ slug: string; name: string }[]>([]);
  const [adminErrors, setAdminErrors] = useState<{ username?: string; password?: string; email?: string; first_name?: string; last_name?: string }>({});
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createdAccountNo, setCreatedAccountNo] = useState<string | null>(null);

  // Member expansion state（以 slug 寻址分组）
  const [expandedGroupSlug, setExpandedGroupSlug] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Add member state（以 account_no 指认成员，不暴露内部 id、不以 PII 查询）
  const [addMemberAccountNo, setAddMemberAccountNo] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'leader' | 'member'>('member');
  const [addingMember, setAddingMember] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  // Remove member confirmation state
  const [removeMemberTarget, setRemoveMemberTarget] = useState<GroupMember | null>(null);
  const [removeMemberGroupSlug, setRemoveMemberGroupSlug] = useState<string | null>(null);

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

  useEffect(() => {
    adminAPI.getAdminGroups().then((g) => setAdminGroups(g || [])).catch(() => setAdminGroups([]));
  }, []);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Create Group ---- */

  const openCreate = () => {
    // 关闭后保留已填内容（草稿 groupDraft）；密码/用户名安全原因始终重置
    const d = groupDraft
    setFormName(d?.name ?? '');
    setFormSlug(d?.slug ?? '');
    setFormErrors({});
    setCreateTab(d?.tab ?? 'group');
    setAdminUsername('');
    setAdminPassword('');
    setAdminEmail(d?.email ?? '');
    setAdminFirstName(d?.firstName ?? '');
    setAdminLastName(d?.lastName ?? '');
    setAdminDepartment(d?.department ?? '');
    setAdminPhone(d?.phone ?? '');
    setAdminCountryCode(d?.countryCode ?? '');
    setAdminRole((d?.role ?? 'ops') as 'superadmin' | 'ops' | 'admin_leader' | 'admin_member');
    setAdminIsActive(d?.isActive ?? true);
    setAdminErrors({});
    setCreatedAccountNo(null);
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
      groupDraft = null; // 提交成功：清除草稿
      setShowForm(false);
      fetchGroups();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.createFailed'));
    }
  };

  /* ---- Create Admin Account ---- */

  const handleCreateAdmin = async () => {
    // 创建成功后，提交按钮变为「再创建一个」：重置回输入态
    if (createdAccountNo) {
      setCreatedAccountNo(null);
      setAdminUsername('');
      setAdminPassword('');
      setAdminEmail('');
      setAdminFirstName('');
      setAdminLastName('');
      setAdminDepartment('');
      setAdminPhone('');
      setAdminCountryCode('');
      setAdminRole('ops');
      setAdminIsActive(true);
      setAdminNote('');
      setAdminGroupSlug('');
      setAdminGroupRole('member');
      setAdminErrors({});
      return;
    }
    const username = adminUsername.trim();
    const password = adminPassword;
    const email = adminEmail.trim();
    const firstName = adminFirstName.trim();
    const lastName = adminLastName.trim();
    const errs: { username?: string; password?: string; email?: string; first_name?: string; last_name?: string } = {};
    if (!username) errs.username = t('admin.groups.adminUsernameRequired');
    // 与后端 utils validators.validate_password 保持一致：≥8 位且含大写+小写+(数字|特殊字符)
    const weakPassword =
      !password ||
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !(/\d/.test(password) || /[^A-Za-z0-9]/.test(password));
    if (weakPassword) errs.password = t('admin.groups.adminPasswordHint');
    if (!email) errs.email = t('admin.groups.adminEmailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('admin.groups.adminEmailInvalid');
    if (!firstName) errs.first_name = t('admin.groups.adminFirstNameRequired');
    if (!lastName) errs.last_name = t('admin.groups.adminLastNameRequired');
    setAdminErrors(errs);
    if (Object.keys(errs).some((k) => errs[k as keyof typeof errs])) return;
    try {
      setCreatingAdmin(true);
      const res = await adminAPI.createAdminUser({
        username,
        password,
        email,
        first_name: firstName,
        last_name: lastName,
        role: adminRole,
        department: adminDepartment.trim() || undefined,
        phone: adminPhone.trim() || undefined,
        country_code: adminCountryCode || undefined,
        is_active: adminIsActive,
        note: adminNote.trim() || undefined,
        group_slug: adminGroupSlug || undefined,
        group_role: adminGroupSlug ? adminGroupRole : undefined,
      });
      setCreatedAccountNo(res.account_no || (res.id != null ? String(res.id) : ''));
      showMsg('success', t('admin.groups.createAdminSuccess'));
      groupDraft = null; // 提交成功：清除草稿
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : t('admin.groups.createAdminFailed'));
    } finally {
      setCreatingAdmin(false);
    }
  };

  /* ---- Members ---- */

  const fetchMembers = async (slug: string) => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const list = await groupRepo.listMembers(slug);
      setMembers(list);
    } catch (err: any) {
      setMembersError(err.message || t('admin.groups.loadMembersFailed'));
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleExpand = (slug: string) => {
    if (expandedGroupSlug === slug) {
      setExpandedGroupSlug(null);
      setMembers([]);
      setAddMemberAccountNo('');
    } else {
      setExpandedGroupSlug(slug);
      setAddMemberAccountNo('');
      fetchMembers(slug);
    }
  };

  const handleAddMember = async () => {
    if (!expandedGroupSlug) return;
    const res = validateAddMemberInput({
      rawAccountNo: addMemberAccountNo,
      isSuperAdmin,
      selectedRole: addMemberRole,
    });
    if (!res.ok) {
      showMsg('error', t(res.errorKey!));
      return;
    }
    try {
      setAddingMember(true);
      await groupRepo.addMember(expandedGroupSlug, { account_no: res.account_no!, role: res.role });
      showMsg('success', t('admin.groups.memberAdded'));
      setAddMemberAccountNo('');
      setShowAddMemberDialog(false);
      fetchMembers(expandedGroupSlug);
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.addMemberFailed'));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberTarget || removeMemberGroupSlug === null) return;
    try {
      await groupRepo.removeMember(removeMemberGroupSlug, removeMemberTarget.account_no);
      showMsg('success', t('admin.groups.memberRemoved'));
      setRemoveMemberTarget(null);
      setRemoveMemberGroupSlug(null);
      fetchMembers(removeMemberGroupSlug);
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.removeMemberFailed'));
      setRemoveMemberTarget(null);
      setRemoveMemberGroupSlug(null);
    }
  };

  /* ---- Delete Group ---- */

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    try {
      await groupRepo.deleteGroup(deleteGroupTarget.slug);
      showMsg('success', t('admin.groups.groupDeleted'));
      setDeleteGroupTarget(null);
      if (expandedGroupSlug === deleteGroupTarget.slug) {
        setExpandedGroupSlug(null);
        setMembers([]);
      }
      fetchGroups();
    } catch (err: any) {
      showMsg('error', err.message || t('admin.groups.deleteGroupFailed'));
      setDeleteGroupTarget(null);
    }
  };

  const expandedGroup = groups.find((group) => group.slug === expandedGroupSlug);

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
          {formatDateTime(val as string)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('admin.groups.columnActions'),
      width: '240px',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
          <ExpandBtn onClick={() => handleExpand(record.slug)}>
            {expandedGroupSlug === record.slug ? t('admin.groups.hideMembers') : t('admin.groups.viewMembers')}
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
        actions={<PrimaryBtn onClick={openCreate}>{t('admin.groups.createMenu')}</PrimaryBtn>}
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
            rowKey="slug"
          />
        </div>

        {/* ====== Member Panel (right side) ====== */}
        {expandedGroupSlug !== null && !loading && !error && (
          <MemberPanel>
          <MemberPanelHeader>
            <MemberPanelTitle>
              {expandedGroup ? expandedGroup.name : ''}{t('admin.groups.memberListTitle')}
            </MemberPanelTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <OutlinePrimaryBtn
                onClick={() => {
                  setAddMemberAccountNo('');
                  setShowAddMemberDialog(true);
                }}
              >
                {t('admin.groups.addMemberBtn')}
              </OutlinePrimaryBtn>
              <MemberPanelClose
                onClick={() => {
                  setExpandedGroupSlug(null);
                  setMembers([]);
                }}
              >
                &times;
              </MemberPanelClose>
            </div>
          </MemberPanelHeader>

          {/* Members loading */}
          {membersLoading && <MemberLoading>{t('admin.groups.loadingMembers')}</MemberLoading>}

          {/* Members error */}
          {membersError && !membersLoading && (
            <MemberError>
              <span>{membersError}</span>
              <DangerBtn style={{ marginTop: 8 }} onClick={() => fetchMembers(expandedGroupSlug)}>
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
                  <MemberTh>{t('admin.groups.columnAccountNo')}</MemberTh>
                  <MemberTh>{t('admin.groups.columnUsername')}</MemberTh>
                  <MemberTh>{t('admin.groups.columnRole')}</MemberTh>
                  <MemberTh>{t('admin.groups.columnActions')}</MemberTh>
                </tr>
              </MemberThead>
              <tbody>
                {members.map((m) => (
                  <MemberTr key={m.account_no}>
                    <MemberTd>{m.account_no}</MemberTd>
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
                          setRemoveMemberGroupSlug(expandedGroupSlug);
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

          {/* Add member dialog trigger is in the panel header (添加成员 button) */}
        </MemberPanel>
        )}
      </div>

      {/* ====== Combined Create Dialog: 管理员分组 + 管理员账号 ====== */}
      <FormDialog
        open={showForm}
        title={t('admin.groups.createMenu')}
        submitLabel={
          createTab === 'group'
            ? t('admin.groups.create')
            : createdAccountNo
              ? t('admin.groups.createAnother')
              : creatingAdmin
                ? t('admin.groups.creating')
                : t('admin.groups.createAdmin')
        }
        submitDisabled={creatingAdmin}
        submitVariant="primary"
        cancelLabel={t('common.cancel')}
        onClose={() => {
          // 关闭时保留已填内容（密码/用户名不入草稿——安全）
          groupDraft = {
            tab: createTab,
            name: formName,
            slug: formSlug,
            email: adminEmail,
            firstName: adminFirstName,
            lastName: adminLastName,
            department: adminDepartment,
            phone: adminPhone,
            countryCode: adminCountryCode,
            role: adminRole,
            isActive: adminIsActive,
          };
          setShowForm(false);
        }}
        onSubmit={createTab === 'group' ? handleCreate : handleCreateAdmin}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: Spacing.lg }}>
          <TabBtn type="button" $active={createTab === 'group'} onClick={() => setCreateTab('group')}>
            {t('admin.groups.tabGroup')}
          </TabBtn>
          <TabBtn type="button" $active={createTab === 'admin'} onClick={() => setCreateTab('admin')}>
            {t('admin.groups.tabAdmin')}
          </TabBtn>
        </div>

        {createTab === 'group' ? (
          <>
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
          </>
        ) : createdAccountNo ? (
          <div>
            <div style={{ color: Color.status.success, fontWeight: 600, marginBottom: Spacing.md }}>
              {t('admin.groups.createAdminSuccess')}
            </div>
            <div style={{ padding: Spacing.lg, background: Color.primaryLight, borderRadius: Radius.sm, marginBottom: Spacing.md }}>
              <div style={{ fontSize: FontSize.xs, color: Color.text.muted, marginBottom: 4 }}>{t('admin.groups.adminAccountNoLabel')}</div>
              <div style={{ fontSize: FontSize.lg, fontWeight: 600, color: Color.primaryHover, fontFamily: 'monospace', wordBreak: 'break-all' }}>{createdAccountNo}</div>
            </div>
            <Hint>{t('admin.groups.createAdminCopyHint')}</Hint>
          </div>
        ) : (
          <>
            <FormGroup>
              <Label>{t('admin.groups.adminUsernameLabel')}</Label>
              <Input
                value={adminUsername}
                onChange={(e) => {
                  setAdminUsername(e.target.value);
                  if (adminErrors.username) setAdminErrors((p) => ({ ...p, username: undefined }));
                }}
                placeholder={t('admin.groups.adminUsernamePlaceholder')}
              />
              {adminErrors.username && <ErrorText>{adminErrors.username}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminPasswordLabel')}</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  if (adminErrors.password) setAdminErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder={t('admin.groups.adminPasswordPlaceholder')}
              />
              <Hint>{t('admin.groups.adminPasswordHint')}</Hint>
              {adminErrors.password && <ErrorText>{adminErrors.password}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminEmailRequired')}</Label>
              <Input
                value={adminEmail}
                onChange={(e) => {
                  setAdminEmail(e.target.value);
                  if (adminErrors.email) setAdminErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder={t('admin.groups.adminEmailPlaceholder')}
              />
              {adminErrors.email && <ErrorText>{adminErrors.email}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminFirstNameLabel')}</Label>
              <Input
                value={adminFirstName}
                onChange={(e) => {
                  setAdminFirstName(e.target.value);
                  if (adminErrors.first_name) setAdminErrors((p) => ({ ...p, first_name: undefined }));
                }}
                placeholder={t('admin.groups.adminFirstNameLabel')}
              />
              {adminErrors.first_name && <ErrorText>{adminErrors.first_name}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminLastNameLabel')}</Label>
              <Input
                value={adminLastName}
                onChange={(e) => {
                  setAdminLastName(e.target.value);
                  if (adminErrors.last_name) setAdminErrors((p) => ({ ...p, last_name: undefined }));
                }}
                placeholder={t('admin.groups.adminLastNameLabel')}
              />
              {adminErrors.last_name && <ErrorText>{adminErrors.last_name}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminDepartmentLabel')}</Label>
              <Input
                value={adminDepartment}
                onChange={(e) => setAdminDepartment(e.target.value)}
                placeholder={t('admin.groups.adminDepartmentPlaceholder')}
              />
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminPhoneLabel')}</Label>
              <Input
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder={t('admin.groups.adminPhonePlaceholder')}
              />
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminCountryCodeLabel')}</Label>
              <Select value={adminCountryCode} onChange={(e) => setAdminCountryCode(e.target.value)}>
                {COUNTRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.key)}</option>
                ))}
              </Select>
              <Hint>{t('admin.groups.adminCountryCodeHint')}</Hint>
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminRoleLabel')}</Label>
              <Select value={adminRole} onChange={(e) => setAdminRole(e.target.value as 'ops' | 'superadmin' | 'admin_leader' | 'admin_member')}>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.key)}</option>
                ))}
              </Select>
              <Hint>{t('admin.groups.adminRoleHint')}</Hint>
            </FormGroup>
            <FormGroup>
              <ToggleRow>
                <ToggleSwitch>
                  <ToggleInput
                    type="checkbox"
                    checked={adminIsActive}
                    onChange={(e) => setAdminIsActive(e.target.checked)}
                  />
                  <ToggleSlider />
                </ToggleSwitch>
                <ToggleLabel>{t('admin.groups.adminIsActive')}</ToggleLabel>
              </ToggleRow>
              <Hint>{t('admin.groups.adminIsActiveHint')}</Hint>
            </FormGroup>
            <FormGroup>
              <Label>{t('admin.groups.adminGroup')}</Label>
              <Select
                value={adminGroupSlug}
                onChange={(e) => setAdminGroupSlug(e.target.value)}
              >
                <option value="">{t('admin.groups.adminGroupNone')}</option>
                {adminGroups.map((g) => (
                  <option key={g.slug} value={g.slug}>{g.name}</option>
                ))}
              </Select>
              <Hint>{t('admin.groups.adminGroupHint')}</Hint>
            </FormGroup>
            {adminGroupSlug && (
              <FormGroup>
                <Label>{t('admin.groups.adminGroupRole')}</Label>
                <Select
                  value={adminGroupRole}
                  onChange={(e) => setAdminGroupRole(e.target.value as 'leader' | 'member')}
                >
                  <option value="member">{t('admin.groups.adminGroupRoleMember')}</option>
                  <option value="leader">{t('admin.groups.adminGroupRoleLeader')}</option>
                </Select>
              </FormGroup>
            )}
            <FormGroup>
              <Label>{t('admin.groups.adminNote')}</Label>
              <Input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={t('admin.groups.adminNotePlaceholder')}
              />
            </FormGroup>
          </>
        )}
      </FormDialog>

      {/* ====== Add Member Dialog ======
          修复：showAddMemberDialog / addMemberAccountNo / addMemberRole / handleAddMember
          此前为孤儿状态（定义+set 但从未在 JSX 渲染），Add Member 按钮点击无任何反馈。 */}
      {showAddMemberDialog && (
        <FormDialog
          open={showAddMemberDialog}
          title={t('admin.groups.addMemberBtn')}
          submitLabel={addingMember ? t('admin.groups.memberAdded') : t('admin.groups.addMemberBtn')}
          submitDisabled={addingMember}
          cancelLabel={t('common.cancel')}
          onClose={() => setShowAddMemberDialog(false)}
          onSubmit={handleAddMember}
        >
          <FormGroup>
            <Label>{t('admin.groups.accountNoLabel')}</Label>
            <Input
              value={addMemberAccountNo}
              onChange={(e) => setAddMemberAccountNo(e.target.value)}
              placeholder="ZG-…"
            />
            <Hint>{t('admin.groups.addMemberHint')}</Hint>
          </FormGroup>
          <FormGroup>
            <Label>{t('admin.groups.roleLabel')}</Label>
            <Select
              value={addMemberRole}
              onChange={(e) => setAddMemberRole(e.target.value as 'leader' | 'member')}
            >
              <option value="member">{t('admin.groups.roleMember')}</option>
              {isSuperAdmin && <option value="leader">{t('admin.groups.roleLeader')}</option>}
            </Select>
          </FormGroup>
        </FormDialog>
      )}

      {/* ====== Remove Member Confirmation ====== */}
      {removeMemberTarget && removeMemberGroupSlug !== null && (
        <ConfirmDialog
          title={t('admin.groups.removeMember')}
          message={composeRemoveMemberConfirmMessage({
            groupName: expandedGroup?.name || '',
            username: removeMemberTarget.username || removeMemberTarget.account_no,
            t,
          })}
          confirmLabel={t('admin.groups.confirmRemove')}
          danger
          onConfirm={handleRemoveMember}
          onCancel={() => {
            setRemoveMemberTarget(null);
            setRemoveMemberGroupSlug(null);
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
