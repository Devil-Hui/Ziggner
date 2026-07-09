import styled from 'styled-components';
import type { PaymentMethodType } from '../../../types/payment';
import { tokens } from '../../../theme/tokens';

const Wrapper = styled.div`
  display: flex;
  gap: 16px;
`;
const Card = styled.button<{ $selected: boolean }>`
  flex: 1;
  padding: 24px;
  border: 2px solid ${p => p.$selected ? tokens.Color.primary : tokens.Color.border.light};
  border-radius: ${tokens.Radius.md};
  background: ${p => p.$selected ? `${tokens.Color.primary}08` : tokens.Color.bg.page};
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s;
  &:hover { border-color: ${tokens.Color.primary}; }
`;
const Icon = styled.div`
  font-size: 32px;
  margin-bottom: 8px;
`;
const Label = styled.div`
  font-size: ${tokens.FontSize.md};
  font-weight: ${tokens.FontWeight.semibold};
  color: ${tokens.Color.text.heading};
`;
const Desc = styled.div`
  font-size: ${tokens.FontSize.sm};
  color: ${tokens.Color.text.secondary};
  margin-top: 4px;
`;

interface Props {
  selected: PaymentMethodType;
  onChange: (method: PaymentMethodType) => void;
}

export function PaymentMethodSelector({ selected, onChange }: Props) {
  return (
    <Wrapper>
      <Card $selected={selected === 'stripe'} onClick={() => onChange('stripe')}>
        <Icon>💳</Icon>
        <Label>Stripe</Label>
        <Desc>Credit / Debit Card</Desc>
      </Card>
      <Card $selected={selected === 'paypal'} onClick={() => onChange('paypal')}>
        <Icon>🅿️</Icon>
        <Label>PayPal</Label>
        <Desc>Pay with PayPal</Desc>
      </Card>
    </Wrapper>
  );
}
