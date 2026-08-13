import { createContext, useContext, type ReactNode } from 'react';
import { httpAdminGroupRepository, type AdminGroupRepository } from './AdminGroupRepository';

// 组合根：在此将抽象绑定到默认 HTTP 实现；测试可注入 mock 实现。
const AdminGroupRepositoryContext = createContext<AdminGroupRepository>(httpAdminGroupRepository);

export function AdminGroupRepositoryProvider({
  repository = httpAdminGroupRepository,
  children,
}: {
  repository?: AdminGroupRepository;
  children: ReactNode;
}) {
  return (
    <AdminGroupRepositoryContext.Provider value={repository}>
      {children}
    </AdminGroupRepositoryContext.Provider>
  );
}

export function useAdminGroupRepository(): AdminGroupRepository {
  return useContext(AdminGroupRepositoryContext);
}
