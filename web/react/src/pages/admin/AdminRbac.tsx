// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { PrimaryBtn as SaveBtn, Input as SearchInput, SecondaryBtn, SecondaryBtn as ActionBtn, SecondaryBtn as CancelBtn, FormGroup, Label, ErrorText, Hint, Select } from '../../components/admin/common/ui'
import FormDialog from '../../components/admin/common/FormDialog'
import { adminAPI, type RbacMatrix, type RbacUser, type RbacDomain } from '../../api/admin'
import DataTable, { type Column } from '../../components/admin/common/DataTable'
import Pagination from '../../components/admin/common/Pagination'
import PageHeader from '../../components/admin/common/PageHeader'
import { useTranslation } from '../../i18n'

// ── Styled Components ──

const PageContainer = styled.div`
  padding: 0;
`

const Tabs = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${Color.border.medium};
  margin-bottom: ${Spacing.lg}px;
`

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 18px;
  font-size: ${FontSize.md}px;
  color: ${({ $active }) => ($active ? Color.primaryHover : Color.text.secondary)};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? Color.primaryHover : 'transparent')};
  cursor: pointer;
  transition: ${Transition.fast};
  &:hover {
    color: ${Color.primaryHover};
  }
`

const MatrixLayout = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: ${Spacing.lg}px;
  align-items: start;
`

const RoleList = styled.div`
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  overflow: hidden;
`

const RoleItem = styled.button<{ $active: boolean }>`
  display: block;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  font-size: ${FontSize.sm}px;
  color: ${({ $active }) => ($active ? '#fff' : Color.text.primary)};
  background: ${({ $active }) => ($active ? Color.primaryHover : 'transparent')};
  border: none;
  border-bottom: 1px solid ${Color.border.light};
  cursor: pointer;
  transition: ${Transition.fast};
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ $active }) => ($active ? Color.primaryHover : Color.primaryLight)};
  }
`

const MatrixPanel = styled.div`
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  padding: ${Spacing.lg}px;
`

const DomainSection = styled.div`
  margin-bottom: ${Spacing.lg}px;
  &:last-child {
    margin-bottom: 0;
  }
`

const DomainTitle = styled.h4`
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.secondary};
  margin: 0 0 8px 0;
`

const PermGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
`

const PermLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.primary};
  padding: 6px 8px;
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  &:hover {
    background: ${Color.primaryLight};
  }
  input {
    accent-color: ${Color.primaryHover};
  }
`

const SuperAdminHint = styled.div`
  padding: 12px 14px;
  background: ${Color.primaryLight};
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: ${Spacing.lg}px;
`

const RoleTag = styled.span`
  display: inline-block;
  font-size: 11px;
  color: ${Color.text.secondary};
  background: ${Color.primaryLight};
  padding: 2px 8px;
  border-radius: 2px;
  margin-right: 6px;
`

const StatusText = styled.span<{ $active: boolean }>`
  font-size: ${FontSize.xs}px;
  color: ${({ $active }) => ($active ? '#2ecc71' : '#999')};
`

// ── Modal ──

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ModalCard = styled.div`
  background: #fff;
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.lg};
  padding: ${Spacing.xl}px;
  width: 420px;
  max-width: 90vw;
`

const ModalTitle = styled.h3`
  font-size: ${FontSize.lg}px;
  color: ${Color.text.primary};
  margin: 0 0 ${Spacing.lg}px 0;
`

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: ${Spacing.lg}px;
`

const ToastMsg = styled.div<{ $type: 'success' | 'error' }>`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: ${Radius.md}px;
  color: #fff;
  background: ${({ $type }) => ($type === 'success' ? '#2ecc71' : '#e74c3c')};
  box-shadow: ${Shadow.md};
  z-index: 2000;
  font-size: ${FontSize.sm}px;
`

// ── Toggle switch (is_active) ──
const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
`

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
`

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
`

const ToggleLabel = styled.span`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
`

// ── Component ──

export default function AdminRbac() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'matrix' | 'users'>('matrix')

  // Matrix state
  const [matrix, setMatrix] = useState<RbacMatrix | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [draft, setDraft] = useState<Record<string, string[]>>({})
  const [matrixLoading, setMatrixLoading] = useState(true)
  const [matrixError, setMatrixError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Users state
  const [users, setUsers] = useState<RbacUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)

  // Role edit modal
  const [editingUser, setEditingUser] = useState<RbacUser | null>(null)
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [savingUser, setSavingUser] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Create admin dialog（超管创建管理员，与普通用户自助注册彻底分离）
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'ops' as 'ops' | 'superadmin' | 'admin_leader' | 'admin_member',
    department: '',
    country_code: '',
    phone: '',
    is_active: true,
    group_slug: '',
    group_role: 'member' as 'leader' | 'member',
    note: '',
  })
  const [createErrors, setCreateErrors] = useState<{
    username?: string
    password?: string
    email?: string
    first_name?: string
    last_name?: string
    role?: string
  }>({})
  const [creating, setCreating] = useState(false)
  const [createdAccountNo, setCreatedAccountNo] = useState<string | null>(null)
  /** 可选：初始管理组绑定（建号+授权一步到位） */
  const [adminGroups, setAdminGroups] = useState<{ slug: string; name: string }[]>([])

  /** 创建表单初始值（用于"再创建一个"重置） */
  const emptyCreateForm = () => ({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'ops' as 'ops' | 'superadmin' | 'admin_leader' | 'admin_member',
    department: '',
    country_code: '',
    phone: '',
    is_active: true,
    group_slug: '',
    group_role: 'member' as 'leader' | 'member',
    note: '',
  })

  useEffect(() => {
    adminAPI.getAdminGroups().then((g) => setAdminGroups(g || [])).catch(() => setAdminGroups([]))
  }, [])

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Matrix ──
  const fetchMatrix = useCallback(async () => {
    try {
      setMatrixLoading(true)
      setMatrixError(null)
      const data = await adminAPI.getRbacMatrix()
      setMatrix(data)
      setDraft(data.grants || {})
      const roles = (data.roles || [])
        .filter((r) => r.value !== 'superadmin')
        .map((r) => r.value)
      setSelectedRole((prev) => (roles.includes(prev) ? prev : roles[0] || ''))
    } catch (err: unknown) {
      setMatrixError(err instanceof Error ? err.message : t('admin.rbac.loadFailed'))
    } finally {
      setMatrixLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  const togglePerm = (code: string) => {
    if (!selectedRole) return
    setDraft((prev) => {
      const current = prev[selectedRole] || []
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code]
      return { ...prev, [selectedRole]: next }
    })
  }

  const saveMatrix = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      const result = await adminAPI.updateRbacRole(selectedRole, draft[selectedRole] || [])
      setMatrix((prev) =>
        prev ? { ...prev, grants: { ...prev.grants, [result.role]: result.perm_codes } } : prev
      )
      showMsg('success', t('admin.rbac.saveSuccess'))
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : t('admin.rbac.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  // ── Users ──
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      setUsersError(null)
      const data = await adminAPI.getRbacUsers({ page, size: 20, account_no: search || undefined })
      if (data && Array.isArray(data.results)) {
        setUsers(data.results)
        setTotal(data.count || 0)
      } else {
        setUsers([])
        setTotal(0)
      }
    } catch (err: unknown) {
      setUsersError(err instanceof Error ? err.message : t('admin.rbac.loadUsersFailed'))
    } finally {
      setUsersLoading(false)
    }
  }, [page, search, t])

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
  }, [activeTab, fetchUsers])

  const openRoleEditor = (user: RbacUser) => {
    setEditingUser(user)
    setEditRoles(user.roles.filter((r) => r !== 'superadmin'))
  }

  const saveUserRoles = async () => {
    if (!editingUser) return
    setSavingUser(true)
    try {
      await adminAPI.updateUserRoles(editingUser.account_no, editRoles)
      showMsg('success', t('admin.rbac.userRoleSaveSuccess'))
      setEditingUser(null)
      fetchUsers()
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : t('admin.rbac.userRoleSaveFailed'))
    } finally {
      setSavingUser(false)
    }
  }

  /* ---- Create Admin（超管创建管理员账号） ---- */

  const openCreateAdmin = () => {
    setCreateForm(emptyCreateForm())
    setCreateErrors({})
    setCreatedAccountNo(null)
    setShowCreateAdmin(true)
  }

  const handleCreateAdmin = async () => {
    // 创建成功后，提交按钮变为「再创建一个」：重置回输入态
    if (createdAccountNo) {
      setCreatedAccountNo(null)
      setCreateForm(emptyCreateForm())
      setCreateErrors({})
      return
    }
    const username = createForm.username.trim()
    const password = createForm.password
    const email = createForm.email.trim()
    const firstName = createForm.first_name.trim()
    const lastName = createForm.last_name.trim()
    const role = createForm.role
    const errs: {
      username?: string
      password?: string
      email?: string
      first_name?: string
      last_name?: string
      role?: string
    } = {}
    if (!username) errs.username = t('admin.rbac.createAdminUsernameRequired')
    if (!password || password.length < 8) errs.password = t('admin.rbac.createAdminPasswordHint')
    if (!email) errs.email = t('admin.rbac.createAdminEmailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('admin.rbac.createAdminEmailInvalid')
    if (!firstName) errs.first_name = t('admin.rbac.createAdminFirstNameRequired')
    if (!lastName) errs.last_name = t('admin.rbac.createAdminLastNameRequired')
    if (!role) errs.role = t('admin.rbac.createAdminRoleRequired')
    setCreateErrors(errs)
    if (Object.keys(errs).some((k) => errs[k as keyof typeof errs])) return
    try {
      setCreating(true)
      const res = await adminAPI.createAdminUser({
        username,
        password,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        department: createForm.department.trim() || undefined,
        country_code: createForm.country_code || undefined,
        phone: createForm.phone.trim() || undefined,
        is_active: createForm.is_active,
        note: createForm.note.trim() || undefined,
        group_slug: createForm.group_slug || undefined,
        group_role: createForm.group_slug ? createForm.group_role : undefined,
      })
      setCreatedAccountNo(res.account_no ?? null)
      setCreateForm(emptyCreateForm())
      setCreateErrors({})
      fetchUsers()
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : t('admin.rbac.createAdminFailed'))
    } finally {
      setCreating(false)
    }
  }

  const createRoleOptions: { value: 'ops' | 'superadmin' | 'admin_leader' | 'admin_member'; key: string }[] = [
    { value: 'ops', key: 'admin.rbac.createAdminRoleOps' },
    { value: 'superadmin', key: 'admin.rbac.createAdminRoleSuperadmin' },
    { value: 'admin_leader', key: 'admin.rbac.createAdminRoleLeader' },
    { value: 'admin_member', key: 'admin.rbac.createAdminRoleMember' },
  ]

  const roleOptions = (matrix?.roles || []).filter((r) => r.value !== 'superadmin')

  const userColumns: Column<RbacUser>[] = [
    {
      key: 'account_no',
      title: t('admin.rbac.columnAccountNo'),
      width: '170px',
    },
    {
      key: 'username',
      title: t('admin.rbac.columnUsername'),
      width: '140px',
    },
    {
      key: 'email',
      title: t('admin.rbac.columnEmail'),
      width: '200px',
    },
    {
      key: 'roles',
      title: t('admin.rbac.columnRoles'),
      render: (val: unknown, record: RbacUser) => (
        <span>
          {record.is_superuser && <RoleTag>{t('admin.rbac.superAdmin')}</RoleTag>}
          {(val as string[] || []).map((r) =>
            r === 'superadmin' ? null : <RoleTag key={r}>{r}</RoleTag>
          )}
        </span>
      ),
    },
    {
      key: 'is_active',
      title: t('admin.rbac.columnStatus'),
      width: '80px',
      render: (val: unknown) => (
        <StatusText $active={Boolean(val)}>
          {val ? t('admin.rbac.active') : t('admin.rbac.inactive')}
        </StatusText>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '100px',
      render: (_val: unknown, record: RbacUser) => (
        <ActionBtn onClick={() => openRoleEditor(record)}>{t('admin.rbac.editRoles')}</ActionBtn>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.rbac.title')}
        breadcrumb={[{ label: t('admin.rbac.subtitle') }, { label: t('admin.rbac.title') }]}
      />

      <Tabs>
        <Tab $active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')}>
          {t('admin.rbac.tabMatrix')}
        </Tab>
        <Tab $active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
          {t('admin.rbac.tabUsers')}
        </Tab>
      </Tabs>

      {activeTab === 'matrix' && (
        <MatrixLayout>
          <RoleList>
            {roleOptions.map((role) => (
              <RoleItem
                key={role.value}
                $active={selectedRole === role.value}
                onClick={() => setSelectedRole(role.value)}
              >
                {role.label}
              </RoleItem>
            ))}
          </RoleList>

          <MatrixPanel>
            <SuperAdminHint>{t('admin.rbac.superAdminHint')}</SuperAdminHint>
            {matrixLoading ? (
              <div style={{ color: Color.text.muted }}>Loading…</div>
            ) : matrixError ? (
              <div style={{ color: '#e74c3c' }}>{matrixError}</div>
            ) : (
              <>
                {(matrix?.domains || []).map((domain: RbacDomain) => (
                  <DomainSection key={domain.domain}>
                    <DomainTitle>
                      {domain.domain} · {domain.permissions.length}
                    </DomainTitle>
                    <PermGrid>
                      {domain.permissions.map((perm) => (
                        <PermLabel key={perm.code}>
                          <input
                            type="checkbox"
                            checked={(draft[selectedRole] || []).includes(perm.code)}
                            onChange={() => togglePerm(perm.code)}
                          />
                          <span title={perm.code}>{perm.label}</span>
                        </PermLabel>
                      ))}
                    </PermGrid>
                  </DomainSection>
                ))}
                <SaveBtn onClick={saveMatrix} disabled={saving || !selectedRole}>
                  {t('admin.rbac.save')}
                </SaveBtn>
              </>
            )}
          </MatrixPanel>
        </MatrixLayout>
      )}

      {activeTab === 'users' && (
        <>
          <div style={{ marginBottom: Spacing.md, display: 'flex', gap: 8, alignItems: 'center' }}>
            <SearchInput
              placeholder={t('admin.rbac.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <SaveBtn onClick={openCreateAdmin}>{t('admin.rbac.createAdmin')}</SaveBtn>
          </div>
          <DataTable<RbacUser>
            columns={userColumns}
            data={users}
            loading={usersLoading}
            error={usersError}
            onRetry={fetchUsers}
            emptyTitle={t('admin.rbac.noData')}
            emptyIcon="👥"
            rowKey="account_no"
          />
          <Pagination current={page} total={total} onChange={setPage} />
        </>
      )}

      {editingUser && (
        <ModalOverlay onClick={() => setEditingUser(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {t('admin.rbac.roleEdit')}: {editingUser.username}
            </ModalTitle>
            {roleOptions.map((role) => (
              <PermLabel key={role.value}>
                <input
                  type="checkbox"
                  checked={editRoles.includes(role.value)}
                  onChange={() =>
                    setEditRoles((prev) =>
                      prev.includes(role.value)
                        ? prev.filter((r) => r !== role.value)
                        : [...prev, role.value]
                    )
                  }
                />
                <span>{role.label}</span>
              </PermLabel>
            ))}
            <ModalActions>
              <CancelBtn onClick={() => setEditingUser(null)}>{t('admin.rbac.close')}</CancelBtn>
              <SaveBtn onClick={saveUserRoles} disabled={savingUser}>
                {t('admin.rbac.confirm')}
              </SaveBtn>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {showCreateAdmin && (
        <FormDialog
          open={showCreateAdmin}
          title={t('admin.rbac.createAdminTitle')}
          submitLabel={createdAccountNo ? t('admin.rbac.createAnother') : creating ? t('admin.rbac.creating') : t('admin.rbac.create')}
          submitDisabled={creating}
          submitVariant="primary"
          cancelLabel={t('common.cancel')}
          onClose={() => setShowCreateAdmin(false)}
          onSubmit={handleCreateAdmin}
        >
          {createdAccountNo ? (
            <div>
              <div style={{ color: Color.status.success, fontWeight: 600, marginBottom: Spacing.md }}>
                {t('admin.rbac.createAdminSuccess')}
              </div>
              <div style={{ padding: Spacing.lg, background: Color.primaryLight, borderRadius: Radius.sm, marginBottom: Spacing.md }}>
                <div style={{ fontSize: FontSize.xs, color: Color.text.muted, marginBottom: 4 }}>{t('admin.rbac.accountNoLabel')}</div>
                <div style={{ fontSize: FontSize.lg, fontWeight: 600, color: Color.primaryHover, fontFamily: 'monospace', wordBreak: 'break-all' }}>{createdAccountNo}</div>
              </div>
              <Hint>{t('admin.rbac.createAdminCopyHint')}</Hint>
            </div>
          ) : (
            <>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminUsername')}</Label>
                <SearchInput
                  value={createForm.username}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, username: e.target.value }))
                    if (createErrors.username) setCreateErrors((p) => ({ ...p, username: undefined }))
                  }}
                  placeholder={t('admin.rbac.createAdminUsernamePlaceholder')}
                />
                {createErrors.username && <ErrorText>{createErrors.username}</ErrorText>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminPassword')}</Label>
                <SearchInput
                  type="password"
                  value={createForm.password}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, password: e.target.value }))
                    if (createErrors.password) setCreateErrors((p) => ({ ...p, password: undefined }))
                  }}
                  placeholder={t('admin.rbac.createAdminPasswordPlaceholder')}
                />
                {createErrors.password && <ErrorText>{createErrors.password}</ErrorText>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminEmailRequired')}</Label>
                <SearchInput
                  value={createForm.email}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, email: e.target.value }))
                    if (createErrors.email) setCreateErrors((p) => ({ ...p, email: undefined }))
                  }}
                  placeholder={t('admin.rbac.createAdminEmailPlaceholder')}
                />
                {createErrors.email && <ErrorText>{createErrors.email}</ErrorText>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminFirstName')}</Label>
                <SearchInput
                  value={createForm.first_name}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, first_name: e.target.value }))
                    if (createErrors.first_name) setCreateErrors((p) => ({ ...p, first_name: undefined }))
                  }}
                  placeholder={t('admin.rbac.createAdminFirstName')}
                />
                {createErrors.first_name && <ErrorText>{createErrors.first_name}</ErrorText>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminLastName')}</Label>
                <SearchInput
                  value={createForm.last_name}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, last_name: e.target.value }))
                    if (createErrors.last_name) setCreateErrors((p) => ({ ...p, last_name: undefined }))
                  }}
                  placeholder={t('admin.rbac.createAdminLastName')}
                />
                {createErrors.last_name && <ErrorText>{createErrors.last_name}</ErrorText>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminRole')}</Label>
                <Select
                  value={createForm.role}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, role: e.target.value as 'ops' | 'superadmin' | 'admin_leader' | 'admin_member' }))
                    if (createErrors.role) setCreateErrors((p) => ({ ...p, role: undefined }))
                  }}
                >
                  {createRoleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{t(o.key)}</option>
                  ))}
                </Select>
                {createErrors.role && <ErrorText>{createErrors.role}</ErrorText>}
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminDepartment')}</Label>
                <SearchInput
                  value={createForm.department}
                  onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder={t('admin.rbac.createAdminDepartmentPlaceholder')}
                />
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminPhoneLabel')}</Label>
                <SearchInput
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={t('admin.rbac.createAdminPhonePlaceholder')}
                />
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminCountryCodeLabel')}</Label>
                <SearchInput
                  value={createForm.country_code}
                  onChange={(e) => setCreateForm((p) => ({ ...p, country_code: e.target.value }))}
                  placeholder={t('admin.rbac.createAdminCountryCodePlaceholder')}
                />
              </FormGroup>
              <FormGroup>
                <ToggleRow>
                  <ToggleSwitch>
                    <ToggleInput
                      type="checkbox"
                      checked={createForm.is_active}
                      onChange={(e) => setCreateForm((p) => ({ ...p, is_active: e.target.checked }))}
                    />
                    <ToggleSlider />
                  </ToggleSwitch>
                  <ToggleLabel>{t('admin.rbac.createAdminIsActive')}</ToggleLabel>
                </ToggleRow>
                <Hint>{t('admin.rbac.createAdminIsActiveHint')}</Hint>
              </FormGroup>
              <FormGroup>
                <Label>{t('admin.rbac.createAdminGroup')}</Label>
                <Select
                  value={createForm.group_slug}
                  onChange={(e) => setCreateForm((p) => ({ ...p, group_slug: e.target.value }))}
                >
                  <option value="">{t('admin.rbac.createAdminGroupNone')}</option>
                  {adminGroups.map((g) => (
                    <option key={g.slug} value={g.slug}>{g.name}</option>
                  ))}
                </Select>
                <Hint>{t('admin.rbac.createAdminGroupHint')}</Hint>
              </FormGroup>
              {createForm.group_slug && (
                <FormGroup>
                  <Label>{t('admin.rbac.createAdminGroupRole')}</Label>
                  <Select
                    value={createForm.group_role}
                    onChange={(e) => setCreateForm((p) => ({ ...p, group_role: e.target.value as 'leader' | 'member' }))}
                  >
                    <option value="member">{t('admin.rbac.createAdminGroupRoleMember')}</option>
                    <option value="leader">{t('admin.rbac.createAdminGroupRoleLeader')}</option>
                  </Select>
                </FormGroup>
              )}
              <FormGroup>
                <Label>{t('admin.rbac.createAdminNote')}</Label>
                <SearchInput
                  value={createForm.note}
                  onChange={(e) => setCreateForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder={t('admin.rbac.createAdminNotePlaceholder')}
                />
              </FormGroup>
            </>
          )}
        </FormDialog>
      )}

      {toast && <ToastMsg $type={toast.type}>{toast.msg}</ToastMsg>}
    </PageContainer>
  )
}
