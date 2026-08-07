import styled from 'styled-components';
import { useState } from 'react';
import { tokens } from '../../../theme/tokens';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
const Row = styled.div`
  display: flex;
  gap: 12px;
  @media (max-width: ${tokens.Breakpoint.mobile}px) { flex-direction: column; }
`;
const Field = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid ${tokens.Color.border.medium};
  border-radius: ${tokens.Radius.sm};
  font-size: ${tokens.FontSize.md};
  &:focus { outline: none; border-color: ${tokens.Color.primary}; }
`;
const Error = styled.span` color: ${tokens.Color.status.error}; font-size: ${tokens.FontSize.xs}; `;
const Submit = styled.button`
  padding: 12px;
  background: ${tokens.Color.primary};
  color: #fff;
  border: none;
  border-radius: ${tokens.Radius.md};
  font-size: ${tokens.FontSize.md};
  font-weight: ${tokens.FontWeight.semibold};
  cursor: pointer;
`;

interface Props {
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
}

export function AddressForm({ onSubmit, onCancel }: Props) {
  const [fields, setFields] = useState({ name: '', phone: '', street: '', city: '', state: '', zip: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fields.name.trim()) e.name = 'Required';
    if (!fields.phone.trim()) e.phone = 'Required';
    if (!fields.street.trim()) e.street = 'Required';
    if (!fields.city.trim()) e.city = 'Required';
    if (!fields.state.trim()) e.state = 'Required';
    if (!fields.zip.trim()) e.zip = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(fields);
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Field placeholder="Full Name" value={fields.name} onChange={set('name')} />
        {errors.name && <Error>{errors.name}</Error>}
        <Field placeholder="Phone" value={fields.phone} onChange={set('phone')} />
        {errors.phone && <Error>{errors.phone}</Error>}
      </Row>
      <Field placeholder="Street Address" value={fields.street} onChange={set('street')} />
      {errors.street && <Error>{errors.street}</Error>}
      <Row>
        <Field placeholder="City" value={fields.city} onChange={set('city')} />
        {errors.city && <Error>{errors.city}</Error>}
        <Field placeholder="State" value={fields.state} onChange={set('state')} />
        {errors.state && <Error>{errors.state}</Error>}
        <Field placeholder="ZIP Code" value={fields.zip} onChange={set('zip')} />
        {errors.zip && <Error>{errors.zip}</Error>}
      </Row>
      <Row>
        <Submit type="submit">Save Address</Submit>
        <Submit as="button" type="button" onClick={onCancel} style={{ background: tokens.Color.border.light, color: tokens.Color.text.secondary }}>
          Cancel
        </Submit>
      </Row>
    </Form>
  );
}
