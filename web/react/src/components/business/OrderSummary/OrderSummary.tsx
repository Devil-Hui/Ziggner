import styled from 'styled-components';
import { useCart } from '../../../store/CartContext';
import { tokens } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n';

const Wrapper = styled.div`
  background: ${tokens.Color.bg.page};
  border-radius: ${tokens.Radius.md};
  padding: 20px;
`;
const Title = styled.h3` font-size: ${tokens.FontSize.lg}; margin-bottom: 16px; `;
const Row = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: ${tokens.FontSize.md};
`;
const Total = styled(Row)`
  border-top: 1px solid ${tokens.Color.border.light};
  margin-top: 8px;
  padding-top: 12px;
  font-weight: ${tokens.FontWeight.bold};
  font-size: ${tokens.FontSize.lg};
`;
const CTA = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  background: ${tokens.Color.primary};
  color: #fff;
  border: none;
  border-radius: ${tokens.Radius.md};
  font-size: ${tokens.FontSize.md};
  font-weight: ${tokens.FontWeight.semibold};
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

interface Props {
  onCheckout: () => void;
  disabled?: boolean;
}

export function OrderSummary({ onCheckout, disabled }: Props) {
  const { items, total } = useCart();
  const { t } = useTranslation();
  const shipping = total > 0 ? 0 : 0; // Free shipping for MVP
  const tax = 0; // Tax calculation placeholder
  const grand = total + shipping + tax;

  return (
    <Wrapper>
      <Title>{t('store.orderSummary.title')}</Title>
      <Row>
        <span>{t('store.orderSummary.subtotalItems').replace('{count}', String(items.length))}</span>
        <span>${total.toFixed(2)}</span>
      </Row>
      <Row>
        <span>{t('store.orderSummary.shipping')}</span>
        <span>{t('store.orderSummary.free')}</span>
      </Row>
      <Row>
        <span>{t('store.orderSummary.tax')}</span>
        <span>${tax.toFixed(2)}</span>
      </Row>
      <Total>
        <span>{t('store.orderSummary.total')}</span>
        <span>${grand.toFixed(2)}</span>
      </Total>
      <CTA onClick={onCheckout} disabled={disabled}>
        {disabled
          ? t('store.orderSummary.processing')
          : t('store.orderSummary.placeOrder').replace('${amount}', grand.toFixed(2))}
      </CTA>
    </Wrapper>
  );
}
