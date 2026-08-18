import { adminAPI } from '../api/admin';
import type { GroupItem, GroupMember } from '../api/admin';

// 领域模型：GroupItem 的运行时数据含 member_count（后端返回但未在后端类型中声明），
// 在此补全以保证删除确认等场景的类型正确，避免依赖后端 singleton 的隐式形状。
export type AdminGroupItem = GroupItem & { member_count?: number };
export type { GroupMember };

// 依赖倒置：页面只依赖此抽象，不依赖 adminAPI 具体实现，便于单元测试替换为 mock。
export interface AdminGroupRepository {
  listGroups(): Promise<AdminGroupItem[]>;
  createGroup(data: { name: string; slug: string }): Promise<AdminGroupItem>;
  /** 以 slug 寻址分组、以 account_no 指认成员（不暴露内部 id、不以 PII 查询） */
  listMembers(slug: string): Promise<GroupMember[]>;
  addMember(slug: string, data: { account_no: string; role: string }): Promise<void>;
  removeMember(slug: string, accountNo: string): Promise<void>;
  updateGroup(id: number, data: { name?: string; slug?: string; description?: string }): Promise<AdminGroupItem>;
  deleteGroup(id: number): Promise<void>;
}

// 默认实现：HTTP 适配器，包裹 adminAPI 的 group 方法并归一化响应形状。
export class HttpAdminGroupRepository implements AdminGroupRepository {
  async listGroups(): Promise<AdminGroupItem[]> {
    const data = await adminAPI.getAdminGroups();
    const list = Array.isArray(data) ? data : (data as { items?: GroupItem[]; results?: GroupItem[] }).items
      || (data as { results?: GroupItem[] }).results || [];
    return list as AdminGroupItem[];
  }

  async createGroup(data: { name: string; slug: string }): Promise<AdminGroupItem> {
    return adminAPI.createAdminGroup(data);
  }

  async listMembers(slug: string): Promise<GroupMember[]> {
    const data = await adminAPI.getGroupMembers(slug);
    return (data?.members || []) as GroupMember[];
  }

  async addMember(slug: string, data: { account_no: string; role: string }): Promise<void> {
    await adminAPI.addGroupMember(slug, data);
  }

  async removeMember(slug: string, accountNo: string): Promise<void> {
    await adminAPI.removeGroupMember(slug, accountNo);
  }

  async updateGroup(id: number, data: { name?: string; slug?: string; description?: string }): Promise<AdminGroupItem> {
    return adminAPI.updateGroup(id, data);
  }

  async deleteGroup(id: number): Promise<void> {
    await adminAPI.deleteGroup(id);
  }
}

export const httpAdminGroupRepository: AdminGroupRepository = new HttpAdminGroupRepository();
