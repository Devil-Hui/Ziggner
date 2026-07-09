import styled from 'styled-components';
import { Color, Spacing, FontSize } from '../../../theme/tokens';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 ${Spacing.xl}px 0;
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.xs}px;
`;

const Title = styled.h1`
  font-size: ${FontSize.xl}px;
  font-weight: ${600};
  color: ${Color.text.heading};
  margin: 0;
`;

const Breadcrumb = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BreadcrumbItem = styled.span<{ $active?: boolean }>`
  color: ${({ $active }) => ($active ? Color.text.secondary : Color.text.muted)};
`;

const BreadcrumbSep = styled.span`
  color: ${Color.border.dark};
`;

const Actions = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
`;

interface PageHeaderProps {
  title: string;
  breadcrumb?: { label: string; path?: string }[];
  actions?: React.ReactNode;
}

export default function PageHeader({ title, breadcrumb, actions }: PageHeaderProps) {
  return (
    <Container>
      <Left>
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb>
            {breadcrumb.map((item, idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {idx > 0 && <BreadcrumbSep>/</BreadcrumbSep>}
                <BreadcrumbItem $active={idx === breadcrumb.length - 1}>
                  {item.label}
                </BreadcrumbItem>
              </span>
            ))}
          </Breadcrumb>
        )}
        <Title>{title}</Title>
      </Left>
      {actions && <Actions>{actions}</Actions>}
    </Container>
  );
}