import styled from 'styled-components';
import type { ShippingAddress } from '../../../types/order';
import { tokens } from '../../../theme/tokens';

const Card = styled.div<{ $selected: boolean }>`
  padding: 16px;
  border: 2px solid ${p => p.$selected ? tokens.Color.primary : tokens.Color.border};
  border-radius: ${tokens.Radius.md};
  cursor: pointer;
  transition: border-color 0.2s;
  &:hover { border-color: ${tokens.Color.primary}; }
`;
const Name = styled.div` font-weight: ${tokens.FontWeight.semibold}; `;
const Phone = styled.span` color: ${tokens.Color.textSecondary}; margin-left: 8px; `;
const Street = styled.div` color: ${tokens.Color.textSecondary}; font-size: ${tokens.FontSize.sm}; `;
const City = styled.div` color: ${tokens.Color.textSecondary}; font-size: ${tokens.FontSize.sm}; `;

interface Props {
  address: ShippingAddress;
  selected: boolean;
  onSelect: () => void;
}

export function AddressCard({ address, selected, onSelect }: Props) {
  return (
    <Card $selected={selected} onClick={onSelect}>
      <Name>{address.name}<Phone>{address.phone}</Phone></Name>
      <Street>{address.street}</Street>
      <City>{address.city}, {address.state} {address.zip}</City>
    </Card>
  );
}
