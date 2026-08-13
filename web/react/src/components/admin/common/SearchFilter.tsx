import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize } from '../../../theme/tokens';
import { Input as SearchInput } from './ui';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${Spacing.md}px;
  padding: 0 0 ${Spacing.lg}px 0;
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