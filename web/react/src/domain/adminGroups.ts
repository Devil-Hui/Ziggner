/**
 * 管理组领域逻辑（框架无关，可单元测试）
 * ───────────────────────────────────────────
 * 从 AdminGroups 页面剥离的纯逻辑：校验规则、删除确认文案组合。
 * 不依赖 React / styled-components / i18n 运行时，仅接收翻译函数 t，
 * 从而满足"核心领域不依赖 UI/框架"的依赖倒置与可测试性要求。
 */

export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export interface GroupFormErrors {
  name?: string;
  slug?: string;
}

export const NAME_MAX = 100;
export const SLUG_MAX = 100;

/**
 * 校验建组表单。返回 i18n key（不在此处翻译），保持纯函数、可单测。
 */
export function validateGroupForm(name: string, slug: string): GroupFormErrors {
  const n = name.trim();
  const s = slug.trim();
  const errs: GroupFormErrors = {};

  if (!n) errs.name = 'admin.groups.nameRequired';
  else if (n.length > NAME_MAX) errs.name = 'admin.groups.nameTooLong';

  if (!s) errs.slug = 'admin.groups.slugRequired';
  else if (!SLUG_RE.test(s)) errs.slug = 'admin.groups.slugFormat';
  else if (s.length > SLUG_MAX) errs.slug = 'admin.groups.slugTooLong';

  return errs;
}

/**
 * 组装删除分组的确认文案。memberCount>0 时提示成员将转移到待定组。
 * t 以依赖注入方式传入，避免耦合具体 i18n 实现。
 */
export function composeDeleteConfirmMessage(params: {
  name: string;
  memberCount: number;
  t: (key: string) => string;
}): string {
  const { name, memberCount, t } = params;

  if (memberCount > 0) {
    return t('admin.groups.confirmDeleteGroupWithMembers')
      .replace('{name}', name)
      .replace('{count}', String(memberCount))
      .replace('{target}', t('admin.groups.pendingGroupName'));
  }
  return t('admin.groups.confirmDeleteGroup').replace('{name}', name);
}

/**
 * 校验"添加成员"输入并解析角色。
 * 内聚了原本散落在页面里的：空值校验、userId 解析、非正数校验、
 * 以及"超管可选角色 / 组长仅能加普通成员"的权限判断。
 * 返回 i18n key 而非已翻译文案，保持纯函数、可单测、不耦合 i18n 运行时。
 */
export interface AddMemberResult {
  ok: boolean;
  account_no?: string;
  role: 'leader' | 'member';
  errorKey?: string;
}

// 账户号格式：ZG- 前缀 + 16 位 Crockford Base32（无 I/L/O/U），与后端 apps/users/account.py 对齐
export const ACCOUNT_NO_RE = /^ZG-[0-9A-HJ-NP-TV-Z]{16}$/;

export function validateAddMemberInput(params: {
  rawAccountNo: string;
  isSuperAdmin: boolean;
  selectedRole: 'leader' | 'member';
}): AddMemberResult {
  const { rawAccountNo, isSuperAdmin, selectedRole } = params;
  const trimmed = rawAccountNo.trim();

  if (!trimmed) {
    return { ok: false, role: 'member', errorKey: 'admin.groups.accountNoRequired' };
  }

  if (!ACCOUNT_NO_RE.test(trimmed)) {
    return { ok: false, role: 'member', errorKey: 'admin.groups.accountNoInvalid' };
  }

  // 超管可选择角色；组长仅能添加本队普通成员
  const role: 'leader' | 'member' = isSuperAdmin ? selectedRole : 'member';
  return { ok: true, account_no: trimmed, role };
}

/**
 * 组装"移除成员"确认文案。使用 split/join 做全量替换（区别于页面里
 * 仅替换首个匹配的实现），模板中 token 出现多次也不会遗漏。
 * t 以依赖注入方式传入，避免耦合具体 i18n 实现。
 */
export function composeRemoveMemberConfirmMessage(params: {
  groupName: string;
  username: string;
  t: (key: string) => string;
}): string {
  const { groupName, username, t } = params;
  return t('admin.groups.confirmRemoveMember')
    .split('{group}').join(groupName || '')
    .split('{user}').join(username || '');
}
