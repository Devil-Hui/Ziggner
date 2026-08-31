import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Color, Radius, Spacing, FontSize, FontWeight, Transition } from '../../../theme/tokens';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

const LoadingSpinner = styled.span<{ $size: 'sm' | 'md' | 'lg' }>`
  display: inline-block;
  width: ${({ $size }) => ($size === 'sm' ? 12 : $size === 'lg' ? 18 : 14)}px;
  height: ${({ $size }) => ($size === 'sm' ? 12 : $size === 'lg' ? 18 : 14)}px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  margin-right: ${Spacing.sm}px;
  vertical-align: middle;
`;

const ButtonBase = styled.button<{ $variant: ButtonProps['variant']; $size: ButtonProps['size']; $disabled?: boolean; $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${Spacing.xs}px;
  padding: ${({ $size }) => {
    switch ($size) {
      case 'sm': return `${Spacing.xs}px ${Spacing.lg}px`;
      case 'lg': return `${Spacing.lg}px ${Spacing.xxxl}px`;
      default: return `${Spacing.sm}px ${Spacing.xl}px`;
    }
  }};
  border: ${({ $variant }) => {
    switch ($variant) {
      case 'outline': return `1px solid ${Color.primaryHover}`;
      case 'ghost': return '1px solid transparent';
      case 'secondary': return `1px solid ${Color.border.medium}`;
      case 'danger': return '1px solid transparent';
      default: return 'none';
    }
  }};
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'outline': return Color.bg.card;
      case 'secondary': return Color.primaryLight;
      case 'danger': return Color.status.error;
      case 'ghost': return 'transparent';
      default: return Color.primary;
    }
  }};
  color: ${({ $variant }) => {
    switch ($variant) {
      case 'outline': return Color.primaryHover;
      case 'secondary': return Color.text.secondary;
      case 'ghost': return Color.text.secondary;
      case 'danger': return Color.text.inverse;
      default: return Color.text.inverse;
    }
  }};
  border-radius: ${Radius.sm}px;
  cursor: ${({ $disabled, $loading }) => ($disabled || $loading) ? 'not-allowed' : 'pointer'};
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'sm': return `${FontSize.sm}px`;
      case 'lg': return `${FontSize.lg}px`;
      default: return `${FontSize.base}px`;
    }
  }};
  font-weight: ${FontWeight.medium};
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  transition: all ${Transition.normal};

  &:hover:not(:disabled) {
    ${({ $variant, $loading }) => !$loading && css`
      background: ${(() => {
        switch ($variant) {
          case 'outline': return Color.primaryLight;
          case 'secondary': return Color.border.light;
          case 'danger': return Color.status.error;
          case 'ghost': return Color.border.light;
          default: return Color.primaryHover;
        }
      })()};
    `}
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }
`;

export default function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    disabled,
    loading = false,
    onClick,
    children,
    type = 'button',
    style,
  } = props;

  const isDisabled = disabled || loading;

  return (
    <ButtonBase
      $variant={variant}
      $size={size}
      $disabled={isDisabled}
      $loading={loading}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
      style={style}
    >
      {loading && <LoadingSpinner $size={size} />}
      {children}
    </ButtonBase>
  );
}
