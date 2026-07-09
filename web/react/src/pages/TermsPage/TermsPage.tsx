import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { getActiveTerms, getTermByType } from '../../api/terms';
import type { Term } from '../../api/terms';

const Wrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 16px;
`;

const Title = styled.h1`
  font-size: 28px;
  margin-bottom: 8px;
`;

const Meta = styled.div`
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 32px;
`;

const Content = styled.div`
  line-height: 1.8;
  font-size: 15px;
  color: #374151;
  white-space: pre-wrap;
`;

const Nav = styled.nav`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  color: ${p => p.$active ? '#1a56db' : '#6b7280'};
  font-weight: ${p => p.$active ? '600' : '400'};
  text-decoration: none;
  font-size: 14px;
  &:hover { color: #1a56db; }
`;

const Loading = styled.div`
  text-align: center;
  padding: 64px;
  color: #6b7280;
`;

const ErrorText = styled.div`
  text-align: center;
  padding: 64px;
  color: #dc2626;
`;

const typeLabels: Record<string, string> = {
  terms: '用户协议',
  privacy: '隐私政策',
  refund: '退款政策',
  shipping: '配送说明',
  cookies: 'Cookie 政策',
};

export function TermsPage({ type: propType }: { type?: string }) {
  const params = useParams<{ type: string }>();
  const type = propType || params.type || 'terms';
  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allTypes, setAllTypes] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    setError('');
    getTermByType(type)
      .then(res => {
        // Handle both {code, data} envelope and direct response
        const data = res.data || res;
        setTerm(data);
      })
      .catch(() => setError('加载失败，请稍后重试'))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => {
    // Load all available types for navigation
    getActiveTerms()
      .then(res => {
        const items = res.data || (res as any);
        if (Array.isArray(items)) {
          setAllTypes(items.map((t: Term) => t.type));
        }
      })
      .catch(() => {});
  }, []);

  if (loading) return <Wrapper><Loading>加载中...</Loading></Wrapper>;
  if (error) return <Wrapper><ErrorText>{error}</ErrorText></Wrapper>;
  if (!term) return <Wrapper><ErrorText>条款不存在</ErrorText></Wrapper>;

  return (
    <Wrapper>
      <Nav>
        {(allTypes.length > 0 ? allTypes : Object.keys(typeLabels)).map(t => (
          <NavLink key={t} to={`/terms/${t}/`} $active={t === type}>
            {typeLabels[t] || t}
          </NavLink>
        ))}
      </Nav>
      <Title>{term.title}</Title>
      <Meta>版本 {term.version} · 生效于 {new Date(term.effective_date).toLocaleDateString('zh-CN')}</Meta>
      <Content>{term.content}</Content>
    </Wrapper>
  );
}
