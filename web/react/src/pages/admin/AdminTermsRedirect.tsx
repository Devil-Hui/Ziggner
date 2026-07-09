import { useEffect } from 'react';

export default function AdminTermsRedirect() {
  useEffect(() => {
    // 跳转到 Django admin 的条款管理页面
    const baseUrl = window.location.origin;
    window.location.href = `${baseUrl}/admin/terms/term/`;
  }, []);
  return <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>正在跳转到条款管理...</div>;
}
