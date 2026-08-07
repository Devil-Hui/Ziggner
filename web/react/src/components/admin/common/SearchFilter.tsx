import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize } from '../../../theme/tokens';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${Spacing.md}px;
  padding: 0 0 ${Spacing.lg}px 0;
`;

const SearchInput = styled.input`
  padding: 7px ${Spacing.md}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.xs}px;
  background: ${Color.bg.card};
  color: ${Color.primaryHover};
  outline: none;
  min-width: ${200}px;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${Color.primary};
  }

  &::placeholder {
    color: ${Color.text.muted};
  }
`;

interface SearchFilterProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function SearchFilter({
  placeholder = '搜索...',
  value,
  onChange,
}: SearchFilterProps) {
  return (
    <Container>
      <SearchInput
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Container>
  );
}