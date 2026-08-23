import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Spacing, Transition, FontSize, FontWeight } from '../../theme/tokens'
import { DEFAULT_TAG_COLOR } from '../../constants/tagColors'
import { adminAPI } from '../../api/admin'
import type { ProductMediaItem } from '../../api/admin'
import { useTranslation } from '../../i18n'
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit'
import { MediaManager } from '../../components/admin/common/MediaManager'
import { Icon } from '../../components/admin/common/Icon'
import {
  getAllStagedItems,
  clearAllStaged,
} from '../../utils/mediaStaging'
import { Input, Select, PrimaryBtn, SecondaryBtn } from '../../components/admin/common/ui'

// ── Types ──

interface CategoryNode {
  id: number
  name: string
  parent_id: number | null
  level: number
  is_active: boolean
  children: CategoryNode[]
}

interface SKUFormItem {
  id?: number
  spec_values: Record<string, string>
  price: string
  stock: string
  discount_price: string
  shelf_status: string
  sku_code: string
  barcode: string
  weight: string
  track_inventory: string
}

interface SpecDef {
  name: string
  values: string[]
}

interface TagItem {
  id: number
  name: string
  color?: string
  is_active: boolean
}

// ── Styled ──

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: ${Spacing.xl}px;
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BackRow = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: ${Color.text.secondary};
  font-size: ${FontSize.xs}px;
  transition: color ${Transition.fast};

  &:hover {
    color: ${Color.primary};
  }
`

const Title = styled.h2`
  font-size: ${FontSize.xxl}px;
  line-height: 1.2;
  margin: 0;
  color: ${Color.text.heading};
  font-weight: 600;
  letter-spacing: -0.01em;
`

const HeaderStatus = styled.span<{ $editing: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  margin-top: 4px;
  padding: 5px 12px;
  border-radius: ${Radius.full}px;
  font-size: ${FontSize.xs}px;
  font-weight: 500;
  background: ${({ $editing }) => ($editing ? 'rgba(26,86,219,0.10)' : 'rgba(107,114,128,0.12)')};
  color: ${({ $editing }) => ($editing ? Color.primary : Color.text.secondary)};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`

// ── Header Action Buttons (publish / draft moved from side rail) ──

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const HeaderBtnPrimary = styled(PrimaryBtn)`
  padding: 9px 20px;
  font-size: ${FontSize.sm}px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const HeaderBtnSecondary = styled(SecondaryBtn)`
  padding: 9px 16px;
  font-size: ${FontSize.sm}px;
  white-space: nowrap;
`

const HeaderBtnText = styled.button`
  padding: 9px 12px;
  border: none;
  background: none;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  white-space: nowrap;
  transition: color ${Transition.fast};

  &:hover {
    color: ${Color.text.secondary};
    text-decoration: underline;
  }
`

const Layout = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${Spacing.xl}px;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
`

const MainCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${Spacing.xl}px;
`

const SideRail = styled.aside`
  width: 200px;
  flex-shrink: 0;
  order: -1;
  position: sticky;
  top: 24px;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${Spacing.md}px;

  @media (max-width: 1024px) {
    position: static;
    width: 100%;
    order: 0;
  }
`

// ── Pager (single-section nav) ──

const Pager = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
`

const PagerSpacer = styled.div`
  flex: 1;
`

const PagerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover:not(:disabled) {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

// ── Section Card (left column) ──

const SectionCard = styled.section<{ $hidden?: boolean }>`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
  padding: ${Spacing.xxl}px;
  scroll-margin-top: 84px;
  display: ${({ $hidden }) => ($hidden ? 'none' : 'block')};

  @media (max-width: 600px) {
    padding: ${Spacing.lg}px;
  }
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: ${Spacing.lg}px;
`

const StepBadge = styled.span<{ $active: boolean }>`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  background: ${({ $active }) => ($active ? Color.primary : Color.primaryLight)};
  color: ${({ $active }) => ($active ? '#fff' : Color.primary)};
  transition: background ${Transition.fast};
`

const SectionTitles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`

const SectionTitleText = styled.h3`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`

const RequiredDot = styled.span`
  color: ${Color.status.error};
  font-weight: 700;
  font-size: ${FontSize.sm}px;
`

const SectionDesc = styled.p`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin: 0;
`

const SectionBody = styled.div`
  padding-left: 40px;

  @media (max-width: 600px) {
    padding-left: 0;
  }
`

const SubHead = styled.h4`
  margin: ${Spacing.xl}px 0 ${Spacing.md}px;
  font-size: ${FontSize.base}px;
  font-weight: ${FontWeight.medium};
  color: ${Color.text.primary};
`

// ── Side Cards (slim) ──

const SideCard = styled.div`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  padding: ${Spacing.md}px ${Spacing.sm}px;
`

const SideCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: ${Color.text.heading};
`

const SideCardTitle = styled.h4`
  font-size: ${FontSize.xs}px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: ${Color.text.muted};
`

const SideCardIcon = styled.span`
  display: inline-flex;
  color: ${Color.primary};
`

// Publish card (compact)

const SidePrimaryBtn = styled(PrimaryBtn)`
  width: 100%;
  padding: 8px 14px;
  font-size: ${FontSize.sm}px;
`

const SideSecondaryBtn = styled(SecondaryBtn)`
  width: 100%;
  padding: 7px 14px;
  font-size: ${FontSize.sm}px;
`

const CancelLink = styled.button`
  width: 100%;
  margin-top: 6px;
  border: none;
  background: none;
  color: ${Color.text.muted};
  font-size: ${FontSize.xs}px;
  cursor: pointer;
  padding: 2px;
  transition: color ${Transition.fast};

  &:hover {
    color: ${Color.text.secondary};
    text-decoration: underline;
  }
`

// Section nav (compact)

const SectionNav = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const SectionNavItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: none;
  background: ${({ $active }) => ($active ? Color.primaryLight : 'transparent')};
  border-left: 2px solid ${({ $active }) => ($active ? Color.primary : 'transparent')};
  color: ${({ $active }) => ($active ? Color.primary : Color.text.secondary)};
  padding: 7px 8px;
  border-radius: 0 ${Radius.sm}px ${Radius.sm}px 0;
  cursor: pointer;
  font-size: ${FontSize.xs}px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: background ${Transition.fast}, color ${Transition.fast};

  &:hover {
    background: ${({ $active }) => ($active ? Color.primaryLight : '#f3f4f6')};
    color: ${Color.primary};
  }
`

const NavMark = styled.span<{ $state: 'done' | 'todo' | 'optional' }>`
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 600;
  border: 1.5px solid
    ${({ $state }) =>
      $state === 'done' ? Color.primary : $state === 'todo' ? Color.status.error : Color.border.medium};
  color: ${({ $state }) => ($state === 'done' ? Color.primary : $state === 'todo' ? Color.status.error : Color.text.muted)};
  background: ${({ $state }) => ($state === 'done' ? 'rgba(26,86,219,0.10)' : 'transparent')};
`

const NavLabel = styled.span`
  flex: 1;
  min-width: 0;
`

// Summary (compact)

const SummaryGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${Color.border.light};
`

const SummaryRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
`

const SummaryLabel = styled.span`
  font-size: 11px;
  color: ${Color.text.muted};
  white-space: nowrap;
`

const SummaryValue = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.heading};
  font-weight: 500;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

// Error alert

const AlertBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: ${Spacing.lg}px;
  padding: 12px 14px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: ${Radius.md}px;
  color: ${Color.status.error};
  font-size: ${FontSize.sm}px;
`

// ── Fields (reused across sections) ──

const Field = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const Label = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: 6px;
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.base}px;
  min-height: 96px;
  resize: vertical;
  box-sizing: border-box;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);
  }
`

const SpinIcon = styled.span`
  display: inline-flex;
  animation: spin 1s linear infinite;
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

// ── 新建模式：提交时图片上传进度遮罩 ──

const UploadOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
`

const UploadCard = styled.div`
  width: 360px;
  max-width: 90vw;
  background: #fff;
  border-radius: 12px;
  padding: 28px 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  text-align: center;
`

const UploadSpin = styled.span`
  display: inline-block;
  width: 34px;
  height: 34px;
  border: 3px solid #e5e7eb;
  border-top-color: ${Color.primary};
  border-radius: 50%;
  animation: up-spin 0.8s linear infinite;
  @keyframes up-spin {
    to { transform: rotate(360deg); }
  }
`

const UploadTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 14px 0 16px;
`

const UploadTrack = styled.div`
  width: 100%;
  height: 8px;
  background: #eef0f3;
  border-radius: 999px;
  overflow: hidden;
`

const UploadFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  background: ${Color.primary};
  border-radius: 999px;
  transition: width 0.2s ease;
`

const UploadMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;

  span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
  }
`

// ── Spec Config Styles ──

const SpecConfigRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`

const SpecNameInput = styled(Input)`
  width: 140px;
`

const SpecValueInput = styled(Input)`
  width: 120px;
`

const SpecValueChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid ${Color.primary};
  border-radius: 14px;
  font-size: ${FontSize.xs}px;
  color: ${Color.primary};
  background: ${Color.primaryLight};
`

const SpecValueRemove = styled.span`
  cursor: pointer;
  font-weight: 700;
  margin-left: 2px;
  &:hover { color: ${Color.primaryHover}; }
`

const SpecGroup = styled.div`
  background: ${Color.bg.page};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  padding: 14px 16px;
  margin-bottom: 10px;
`

const SpecGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

const SpecGroupName = styled.span`
  font-weight: 600;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.heading};
`

const SmallBtn = styled.button`
  padding: 4px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  font-size: ${FontSize.xs}px;
  cursor: pointer;
  color: ${Color.text.secondary};
  transition: ${Transition.fast};

  &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }
`

const SmallBtnPrimary = styled(SmallBtn)`
  border-color: ${Color.primary};
  color: ${Color.primary};
  background: ${Color.primaryLight};
  &:hover { background: ${Color.primary}; color: #fff; }
`

// ── Variant Card Styles (Shopify-style) ──

const VariantCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.md}px;
`

const VariantCard = styled.div`
  background: ${Color.bg.page};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  padding: ${Spacing.lg}px;
  position: relative;
  transition: ${Transition.fast};

  &:hover {
    border-color: ${Color.border.medium};
  }
`

const VariantCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${Spacing.md}px;
`

const VariantName = styled.span`
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.text.heading};
`

const VariantRemoveBtn = styled.button`
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  color: ${Color.text.muted};
  cursor: pointer;
  font-size: ${FontSize.md}px;
  line-height: 1;
  padding: 0;
  transition: ${Transition.fast};

  &:hover {
    border-color: ${Color.status.error};
    color: ${Color.status.error};
    background: rgba(220, 38, 38, 0.06);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const VariantMainRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr);
  gap: ${Spacing.md}px;
  margin-bottom: ${Spacing.sm}px;
`

const VariantField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const VariantFieldLabel = styled.label`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  font-weight: ${FontWeight.medium};
`

const VariantPriceInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.heading};
  background: ${Color.bg.card};
  width: 100%;
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);
  }
`

const VariantStockGroup = styled.div`
  display: flex;
  align-items: stretch;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  overflow: hidden;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus-within {
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);
  }
`

const VariantStockBtn = styled.button`
  width: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: ${Color.bg.page};
  color: ${Color.primaryHover};
  font-size: ${FontSize.lg}px;
  font-weight: ${FontWeight.semibold};
  cursor: pointer;
  padding: 0;
  user-select: none;
  transition: ${Transition.fast};

  &:hover {
    background: ${Color.primary};
    color: #fff;
  }

  &:active {
    background: ${Color.primaryDark};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const VariantStockInput = styled.input`
  flex: 1;
  width: 100%;
  padding: 8px 6px;
  border: none;
  font-size: ${FontSize.lg}px;
  font-weight: ${FontWeight.bold};
  color: ${Color.text.heading};
  text-align: center;
  background: transparent;
  box-sizing: border-box;
  min-width: 0;

  &:focus {
    outline: none;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type='number'] {
    -moz-appearance: textfield;
  }
`

const VariantDiscountInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  background: ${Color.bg.card};
  width: 100%;
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);
  }

  &::placeholder {
    color: ${Color.text.muted};
  }
`

const VariantMetaRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: ${Spacing.md}px;
  align-items: end;
  margin-top: ${Spacing.sm}px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const VariantMetaInput = styled.input`
  padding: 7px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  background: ${Color.bg.card};
  width: 100%;
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);
  }

  &::placeholder {
    color: ${Color.text.muted};
  }
`

// ── Checkbox (replaces toggle switches) ──

const CheckRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  user-select: none;
`

const CheckBox = styled.span<{ $checked: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid ${({ $checked }) => ($checked ? Color.primary : Color.border.medium)};
  background: ${({ $checked }) => ($checked ? Color.primary : 'transparent')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  transition: background ${Transition.fast}, border-color ${Transition.fast};
`

const CheckInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`

const VariantAddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px dashed ${Color.primary};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  color: ${Color.primary};
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  margin-top: 12px;
  transition: ${Transition.fast};

  &:hover {
    background: ${Color.primaryLight};
  }
`

const NotTrackingText = styled.span`
  display: block;
  padding: 8px 12px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
  background: ${Color.bg.page};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  text-align: center;
  font-style: italic;
`

// ── Tag Styles ──

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const TagChip = styled.button<{ $selected: boolean; $color?: string }>`
  padding: 5px 14px;
  border: 1px solid ${({ $selected, $color }) => ($selected ? ($color || Color.primary) : ($color || Color.border.medium))};
  border-radius: 16px;
  background: ${({ $selected, $color }) => ($selected ? ($color || Color.primary) : '#fff')};
  color: ${({ $selected }) => ($selected ? '#fff' : Color.text.secondary)};
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover {
    border-color: ${({ $color }) => ($color || Color.primary)};
    color: ${({ $selected, $color }) => ($selected ? '#fff' : ($color || Color.primary))};
  }
`

// ── Helpers ──

function flattenTree(nodes: CategoryNode[], prefix = ''): { id: number; label: string; level: number }[] {
  const result: { id: number; label: string; level: number }[] = []
  for (const node of nodes) {
    if (!node.is_active) continue
    result.push({ id: node.id, label: `${prefix}${node.name}`, level: node.level })
    if (node.children?.length) {
      result.push(...flattenTree(node.children, `${prefix}${'  '.repeat(node.level)}├ `))
    }
  }
  return result
}

/** 格式化变体名称: 按活跃规格顺序拼接 spec values，无规格时返回默认标题 */
function formatVariantName(specValues: Record<string, string>, specNames: string[], t?: (key: string) => string): string {
  const defaultTitle = t ? t('admin.productForm.defaultTitle') : 'Default Title'
  if (specNames.length === 0) return defaultTitle
  const parts = specNames.map(name => specValues[name] || '').filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : defaultTitle
}

// ── Component ──

export default function AdminProductForm() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  // Basic fields
  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [productType, setProductType] = useState('')
  const [tagInput, setTagInput] = useState('')  // Shopify-style tag input (comma-separated)
  const [requiresShipping, setRequiresShipping] = useState(true)
  const [taxable, setTaxable] = useState(true)
  const [productKind, setProductKind] = useState<'physical' | 'virtual'>('physical')  // 实体/虚拟商品
  // 右侧栏当前激活区块（scroll-spy）
  const [activeSection, setActiveSection] = useState<string>('basic')
  const MODULE_ITEMS = [
    { key: 'basic', label: t('admin.productForm.basicInfo'), required: true, desc: t('admin.productForm.sectionDescBasic') },
    { key: 'media', label: t('admin.productForm.mediaSection'), required: false, desc: t('admin.productForm.sectionDescMedia') },
    { key: 'orgSku', label: t('admin.productForm.orgSku'), required: true, desc: t('admin.productForm.sectionDescOrgSku') },
    { key: 'schedule', label: t('admin.productForm.schedule'), required: false, desc: t('admin.productForm.sectionDescSchedule') },
  ]

  // Data sources
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  // ── Dynamic Specs ──
  const [specs, setSpecs] = useState<SpecDef[]>([])

  // SKU
  const [skus, setSkus] = useState<SKUFormItem[]>([
    { spec_values: {}, price: '', stock: '', discount_price: '', shelf_status: 'on_shelf', sku_code: '', barcode: '', weight: '', track_inventory: 'true' },
  ])

  // Schedule
  const [publishAt, setPublishAt] = useState('')
  const [unpublishAt, setUnpublishAt] = useState('')

  // 编辑模式已保存媒体（来自 SPUAdminDetailView）
  const [savedMedia, setSavedMedia] = useState<ProductMediaItem[]>([])

  // State
  const [_loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // 新建模式：提交时图片上传进度（逐张 XHR 进度聚合）
  const [uploadState, setUploadState] = useState<{
    active: boolean
    uploaded: number
    total: number
    percent: number
    fileName: string
  }>({ active: false, uploaded: 0, total: 0, percent: 0, fileName: '' })

  const markDirty = useCallback(() => { setIsDirty(true) }, [])

  // ── Unsaved Changes Guard ──
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Load Data ──

  useEffect(() => {
    adminAPI.getBrands()
      .then((res) => setBrands(res as Array<{ id: number; name: string }>))
      .catch(() => {})

    adminAPI.getCategoryTree()
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {})

    adminAPI.getTags()
      .then((res) => setTags(Array.isArray(res) ? res : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      adminAPI.getSPU(Number(id))
        .then((res) => {
          const data = res as unknown as {
            name: string; brand_id: number; category_id: number;
            description: string; main_image: string; specs?: SpecDef[];
            skus: SKUFormItem[]; tags: TagItem[];
            media?: ProductMediaItem[];
            product_kind?: 'physical' | 'virtual';
            scheduled_publish_at?: string; scheduled_unpublish_at?: string;
          }
          setName(data.name)
          setBrandId(String(data.brand_id))
          setCategoryId(String(data.category_id))
          setDescription(data.description || '')
          if (data.specs?.length) {
            setSpecs(data.specs)
          }
          if (data.skus?.length) {
            setSkus(data.skus.map((s) => ({
              ...s,
              price: String(s.price ?? ''),
              stock: String(s.stock ?? ''),
              discount_price: String(s.discount_price ?? ''),
              track_inventory: String(s.track_inventory ?? 'true'),
            })))
          }
          if (data.tags?.length) {
            setSelectedTags(data.tags.map((t) => t.id))
          }
          if (data.scheduled_publish_at) setPublishAt(data.scheduled_publish_at.slice(0, 16))
          if (data.scheduled_unpublish_at) setUnpublishAt(data.scheduled_unpublish_at.slice(0, 16))
          // 回填商品类型 + 联动 requires_shipping
          if (data.product_kind) {
            setProductKind(data.product_kind)
            setRequiresShipping(data.product_kind === 'physical')
          }
          // 回填已保存媒体
          if (data.media) {
            setSavedMedia(data.media)
          }
        })
        .catch(() => setError(t('admin.productForm.loadFailed')))
    }
  }, [id, isEdit, t])

  const flatCategories = flattenTree(categories)

  // ── Spec Handlers ──

  const addSpec = () => {
    setSpecs([...specs, { name: '', values: [] }])
    markDirty()
  }

  const removeSpec = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx))
    markDirty()
  }

  const updateSpecName = (idx: number, name: string) => {
    setSpecs(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], name }
      return updated
    })
    markDirty()
  }

  const addSpecValue = (idx: number, value: string) => {
    if (!value.trim()) return
    setSpecs(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], values: [...updated[idx].values, value.trim()] }
      return updated
    })
    markDirty()
  }

  const removeSpecValue = (specIdx: number, valIdx: number) => {
    setSpecs(prev => {
      const updated = [...prev]
      updated[specIdx] = { ...updated[specIdx], values: updated[specIdx].values.filter((_, i) => i !== valIdx) }
      return updated
    })
    markDirty()
  }

  // ── SKU Handlers ──

  const addSKU = () => {
    const emptySpec: Record<string, string> = {}
    specs.forEach(s => { if (s.name.trim()) emptySpec[s.name.trim()] = '' })
    setSkus([...skus, { spec_values: emptySpec, price: '', stock: '', discount_price: '', shelf_status: 'on_shelf', sku_code: '', barcode: '', weight: '', track_inventory: 'true' }])
    markDirty()
  }

  const removeSKU = (idx: number) => {
    if (skus.length <= 1) return
    setSkus(skus.filter((_, i) => i !== idx))
    markDirty()
  }

  const updateSKU = (idx: number, field: string, value: string) => {
    setSkus((prev) => {
      const updated = [...prev]
      if (field.startsWith('spec_')) {
        const key = field.replace('spec_', '')
        updated[idx] = { ...updated[idx], spec_values: { ...updated[idx].spec_values, [key]: value } }
      } else {
        updated[idx] = { ...updated[idx], [field]: value }
      }
      return updated
    })
    markDirty()
  }

  // ── Stock +/- with long-press rapid change ──
  const stockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearStockInterval = useCallback(() => {
    if (stockIntervalRef.current !== null) {
      clearInterval(stockIntervalRef.current)
      stockIntervalRef.current = null
    }
  }, [])

  const adjustStock = useCallback((idx: number, delta: number) => {
    setSkus((prev) => {
      const updated = [...prev]
      const currentStock = parseInt(updated[idx].stock, 10) || 0
      const newStock = Math.max(0, currentStock + delta)
      updated[idx] = { ...updated[idx], stock: String(newStock) }
      return updated
    })
    markDirty()
  }, [markDirty])

  const startStockAdjust = useCallback((idx: number, delta: number) => {
    adjustStock(idx, delta)
    stockIntervalRef.current = setInterval(() => {
      adjustStock(idx, delta)
    }, 120)
  }, [adjustStock])

  const stopStockAdjust = useCallback(() => {
    clearStockInterval()
  }, [clearStockInterval])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      clearStockInterval()
    }
  }, [clearStockInterval])

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
    markDirty()
  }

  /** 实体/虚拟商品切换：联动 requires_shipping */
  const handleProductKindChange = (value: 'physical' | 'virtual') => {
    setProductKind(value)
    setRequiresShipping(value === 'physical')
    markDirty()
  }

  /** 编辑模式媒体信息更新回调 */
  const handleMediaUpdate = async (mediaId: number, data: { alt_text?: string; sort_order?: number }) => {
    await adminAPI.updateMedia(mediaId, data)
  }

  // ── Submit ──

  const doSubmit = async (submitForReview = false) => {
    if (!name.trim()) { setError(t('admin.productForm.productNameRequired')); return }
    if (!brandId) { setError(t('admin.productForm.brandRequired')); return }
    if (!categoryId) { setError(t('admin.productForm.categoryRequired')); return }

    setLoading(true)
    setError('')
    try {
      const validSpecs = specs.filter(s => s.name.trim() && s.values.length > 0)
      const spuData = {
        name: name.trim(),
        brand_id: Number(brandId),
        category_id: Number(categoryId),
        description: description.trim(),
        specs: validSpecs,
        meta_title: metaTitle.trim(),
        meta_description: metaDescription.trim(),
        product_type: productType.trim(),
        tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
        requires_shipping: requiresShipping,
        taxable: taxable,
        product_kind: productKind,
      }

      let spuId: number

      if (isEdit && id) {
        await adminAPI.updateSPU(Number(id), spuData)
        spuId = Number(id)

        for (const sku of skus) {
          if (sku.id) {
            await adminAPI.updateSKU(sku.id, {
              spec_values: sku.spec_values,
              price: sku.price,
              stock: Number(sku.stock),
              discount_price: sku.discount_price || null,
              shelf_status: sku.shelf_status,
              sku_code: sku.sku_code || '',
              barcode: sku.barcode || '',
              weight: sku.weight || '0',
              track_inventory: sku.track_inventory === 'true',
            })
          } else {
            await adminAPI.batchCreateSKU({
              spu_id: spuId,
              skus: [{
                spec_values: sku.spec_values,
                price: sku.price,
                stock: Number(sku.stock),
                discount_price: sku.discount_price || null,
                shelf_status: sku.shelf_status,
                sku_code: sku.sku_code || '',
                barcode: sku.barcode || '',
                weight: sku.weight || '0',
                track_inventory: sku.track_inventory === 'true',
              }],
            })
          }
        }

        if (submitForReview) {
          await adminAPI.submitAudit(spuId)
        }
      } else {
        // ── 新建模式 ──
        const stagedItems = await getAllStagedItems()

        // 新建商品：后端 /goods/spu/create 不处理媒体文件，必须先把 SPU 建出来拿到 spuId，
        // 再逐项调用「已验证」的 /goods/media/spu/{id}/upload 端点上传（与编辑模式同一路径，
        // 该端点负责校验、WebP 转码、ProductMedia 落库与 main_image 同步）。
        const spuRes = await adminAPI.createSPU(spuData) as unknown as { id: number }
        spuId = spuRes.id

        // 仅统计有效图片（四尺寸齐全）用于进度总数
        const imageItems = stagedItems.filter(
          (it) =>
            it.mediaType === 'image' &&
            it.thumbBlob && it.listBlob && it.largeBlob && it.originalBlob,
        )
        const totalImages = imageItems.length
        setUploadState({ active: true, uploaded: 0, total: totalImages, percent: 0, fileName: '' })

        for (const item of stagedItems) {
          if (item.mediaType === 'image') {
            const fd = new FormData()
            // 裁剪器输出恒为 WebP，文件名必须带 .webp 扩展名，否则后端扩展名校验会拒绝。
            const base = (item.fileName || 'image').replace(/\.[^.]+$/, '')
            if (item.thumbBlob) fd.append('thumb', item.thumbBlob, `thumb_${base}.webp`)
            if (item.listBlob) fd.append('list', item.listBlob, `list_${base}.webp`)
            if (item.largeBlob) fd.append('large', item.largeBlob, `large_${base}.webp`)
            if (item.originalBlob) fd.append('original', item.originalBlob, `original_${base}.webp`)
            // 端点要求 thumb/list/large/original 四尺寸齐全，缺一不可
            if (fd.has('thumb') && fd.has('list') && fd.has('large') && fd.has('original')) {
              try {
                await adminAPI.uploadMedia(spuId, fd, (p) => {
                  setUploadState((s) => ({ ...s, percent: p, fileName: item.fileName || 'image' }))
                })
              } catch (e) {
                console.warn('[AdminProductForm] 上传图片媒体失败 spu=%s:', spuId, e)
              }
            }
            setUploadState((s) => ({ ...s, uploaded: s.uploaded + 1, percent: 0 }))
          }
          // 视频：/goods/media/spu/{id}/upload 当前仅支持 image（video 为独立能力），
          // create 模式下视频本就未被后端接收，此处不重复塞入被忽略的字段。
        }
        setUploadState((s) => ({ ...s, active: false }))

        if (skus.length > 0) {
          // Validate all SKUs have prices
          const invalidSkus = skus.filter(s => !s.price || s.price === '' || Number(s.price) <= 0)
          if (invalidSkus.length > 0) {
            setError(t('admin.productForm.priceRequired'))
            setLoading(false)
            return
          }
          await adminAPI.batchCreateSKU({
            spu_id: spuId,
            skus: skus.map((s) => ({
              spec_values: s.spec_values,
              price: s.price,
              stock: Number(s.stock),
              discount_price: s.discount_price || null,
              shelf_status: s.shelf_status,
              sku_code: s.sku_code || '',
              barcode: s.barcode || '',
              weight: s.weight || '0',
              track_inventory: s.track_inventory === 'true',
            })),
          })
        }

        if (submitForReview) {
          await adminAPI.submitAudit(spuId)
        }

        await clearAllStaged()
      }

      await adminAPI.setSPUTags({ spu_id: spuId, tag_ids: selectedTags })

      if (publishAt || unpublishAt) {
        await adminAPI.scheduleSPU(spuId, {
          publish_at: publishAt ? new Date(publishAt).toISOString() : undefined,
          unpublish_at: unpublishAt ? new Date(unpublishAt).toISOString() : undefined,
        })
      }

      navigate('/admin/products')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.operationFailed'))
    }
    setLoading(false)
  }

  const { execute: handleSaveDraft, isPending: isSaving } = useDebounceSubmit(
    async () => { await doSubmit(false) },
    800,
  )
  const { execute: handleSaveSubmit, isPending: isSubmitting } = useDebounceSubmit(
    async () => { await doSubmit(true) },
    800,
  )

  const activeSpecNames = specs.filter(s => s.name.trim()).map(s => s.name.trim())
  const activeIndex = MODULE_ITEMS.findIndex((i) => i.key === activeSection)

  // ── 区块完成状态（用于左侧状态栏标记） ──
  const sectionState = (key: string): 'done' | 'todo' | 'optional' => {
    if (key === 'basic') return name.trim() ? 'done' : 'todo'
    if (key === 'orgSku') return (brandId && categoryId) ? 'done' : 'todo'
    if (key === 'media') return productKind === 'virtual' ? 'optional' : 'todo'
    return 'done'
  }

  // ── 概览摘要 ──
  const brandName = brands.find((b) => String(b.id) === brandId)?.name || t('admin.productForm.summaryNotSet')
  const categoryName = flatCategories.find((c) => String(c.id) === categoryId)?.label || t('admin.productForm.summaryNotSet')
  const totalStock = skus.reduce(
    (sum, s) => sum + (s.track_inventory === 'true' ? (parseInt(s.stock, 10) || 0) : 0),
    0,
  )
  const kindLabel = productKind === 'physical' ? t('admin.productForm.kindPhysical') : t('admin.productForm.kindVirtual')

  return (
    <Container>
      {uploadState.active && (
        <UploadOverlay>
          <UploadCard>
            <UploadSpin />
            <UploadTitle>{t('admin.productForm.uploadingImages')}</UploadTitle>
            <UploadTrack>
              <UploadFill
                $percent={
                  uploadState.total
                    ? Math.round(
                        ((uploadState.uploaded + uploadState.percent / 100) / uploadState.total) * 100,
                      )
                    : 0
                }
              />
            </UploadTrack>
            <UploadMeta>
              <span>{uploadState.fileName}</span>
              <span>
                {uploadState.uploaded}/{uploadState.total}（
                {uploadState.total
                  ? Math.round(
                      ((uploadState.uploaded + uploadState.percent / 100) / uploadState.total) * 100,
                    )
                  : 0}
                %）
              </span>
            </UploadMeta>
          </UploadCard>
        </UploadOverlay>
      )}
      <PageHeader>
        <HeaderLeft>
          <BackRow type="button" onClick={() => navigate('/admin/products')}>
            <Icon name="chevron-left" size={12} />
            {t('admin.productForm.backToProducts')}
          </BackRow>
          <Title>{isEdit ? t('admin.productForm.editTitle') : t('admin.productForm.createTitle')}</Title>
        </HeaderLeft>
        <HeaderActions>
          <HeaderBtnSecondary type="button" disabled={isSaving || isSubmitting} onClick={handleSaveDraft}>
            {isSaving ? <><SpinIcon><Icon name="refresh" size={12} /></SpinIcon> {t('admin.productForm.saveDraft')}</> : t('admin.productForm.saveDraft')}
          </HeaderBtnSecondary>
          <HeaderBtnPrimary type="button" disabled={isSaving || isSubmitting} onClick={handleSaveSubmit}>
            {isSubmitting ? <><SpinIcon><Icon name="refresh" size={12} /></SpinIcon> {t('admin.productForm.saveAndSubmit')}</> : t('admin.productForm.saveAndSubmit')}
          </HeaderBtnPrimary>
          <HeaderBtnText type="button" onClick={() => navigate('/admin/products')}>
            {t('common.cancel')}
          </HeaderBtnText>
        </HeaderActions>
        <HeaderStatus $editing={isEdit}>
          {isEdit ? t('admin.productForm.statusEditing') : t('admin.productForm.statusDraft')}
        </HeaderStatus>
      </PageHeader>

      <Layout>
        <MainCol>
          {error && (
            <AlertBar>
              <Icon name="alert" size={16} />
              {error}
            </AlertBar>
          )}

          {/* ── 基础信息 ── */}
          <SectionCard $hidden={activeSection !== 'basic'}>
            <SectionHead>
              <StepBadge $active={activeSection === 'basic'}>1</StepBadge>
              <SectionTitles>
                <SectionTitleText>
                  {t('admin.productForm.basicInfo')}
                  <RequiredDot>*</RequiredDot>
                </SectionTitleText>
                <SectionDesc>{t('admin.productForm.sectionDescBasic')}</SectionDesc>
              </SectionTitles>
            </SectionHead>
            <SectionBody>
              <Field>
                <Label>{t('admin.productForm.productTypeTitle')}</Label>
                <Select value={productKind} onChange={(e) => handleProductKindChange(e.target.value as 'physical' | 'virtual')}>
                  <option value="physical">{t('admin.productForm.kindPhysical')}</option>
                  <option value="virtual">{t('admin.productForm.kindVirtual')}</option>
                </Select>
              </Field>
              <Field>
                <Label>{t('admin.productForm.productName')} *</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); markDirty() }} required placeholder={t('admin.productForm.productNamePlaceholder')} />
              </Field>
              <Field>
                <Label>{t('admin.productForm.descriptionLabel')}</Label>
                <TextArea value={description} onChange={(e) => { setDescription(e.target.value); markDirty() }} placeholder={t('admin.productForm.descriptionPlaceholder')} />
              </Field>
            </SectionBody>
          </SectionCard>

          {/* ── 媒体 ── */}
          <SectionCard $hidden={activeSection !== 'media'}>
            <SectionHead>
              <StepBadge $active={activeSection === 'media'}>2</StepBadge>
              <SectionTitles>
                <SectionTitleText>{t('admin.productForm.mediaSection')}</SectionTitleText>
                <SectionDesc>{t('admin.productForm.sectionDescMedia')}</SectionDesc>
              </SectionTitles>
            </SectionHead>
            <SectionBody>
              <MediaManager
                onChange={() => { /* 创建模式暂存项由 MediaManager 内部管理 IndexedDB */ }}
                {...(isEdit && id ? {
                  spuId: Number(id),
                  savedMedia,
                  onMediaUpdate: handleMediaUpdate,
                } : {})}
              />
            </SectionBody>
          </SectionCard>

          {/* ── 分类与规格 ── */}
          <SectionCard $hidden={activeSection !== 'orgSku'}>
            <SectionHead>
              <StepBadge $active={activeSection === 'orgSku'}>3</StepBadge>
              <SectionTitles>
                <SectionTitleText>
                  {t('admin.productForm.orgSku')}
                  <RequiredDot>*</RequiredDot>
                </SectionTitleText>
                <SectionDesc>{t('admin.productForm.sectionDescOrgSku')}</SectionDesc>
              </SectionTitles>
            </SectionHead>
            <SectionBody>
              <Row>
                <Field>
                  <Label>{t('admin.productForm.brand')} *</Label>
                  <Select value={brandId} onChange={(e) => { setBrandId(e.target.value); markDirty() }} required>
                    <option value="">{t('admin.productForm.selectBrand')}</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
                <Field>
                  <Label>{t('admin.productForm.category')} *</Label>
                  <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); markDirty() }} required>
                    <option value="">{t('admin.productForm.selectCategory')}</option>
                    {flatCategories.map((c) => (
                      <option key={c.id} value={c.id} style={{ paddingLeft: `${c.level * 12}px` }}>
                        {c.label}{c.level === 1 ? ' (L1)' : c.level === 2 ? ' (L2)' : ' (L3)'}
                      </option>
                    ))}
                  </Select>
                </Field>
              </Row>
              <Field>
                <Label>{t('admin.productForm.tags')}</Label>
                <TagList>
                  {tags.map((tag) => (
                    <TagChip
                      key={tag.id}
                      type="button"
                      $selected={selectedTags.includes(tag.id)}
                      $color={tag.color || DEFAULT_TAG_COLOR}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </TagChip>
                  ))}
                </TagList>
              </Field>
              <SubHead>{t('admin.productForm.skuManagement')}</SubHead>
              <SectionDesc style={{ marginTop: 6, marginBottom: 10 }}>
                SKU 参数：每个规格组合（变体）独立定价与库存，价格为该变体的「销售单价（元）」，支持两位小数。上方已填写的为商品基本信息，此处仅填写变体级参数。
              </SectionDesc>
              {specs.map((spec, idx) => (
                <SpecGroup key={idx}>
                  <SpecGroupHeader>
                    <SpecGroupName>规格 {idx + 1}</SpecGroupName>
                    <SmallBtn type="button" onClick={() => removeSpec(idx)}>删除</SmallBtn>
                  </SpecGroupHeader>
                  <SpecConfigRow>
                    <SpecNameInput
                      placeholder="规格名称（如：颜色）"
                      value={spec.name}
                      onChange={(e) => updateSpecName(idx, e.target.value)}
                    />
                    {spec.name.trim() && (
                      <>
                        {spec.values.map((val, vi) => (
                          <SpecValueChip key={vi}>
                            {val}
                            <SpecValueRemove onClick={() => removeSpecValue(idx, vi)}><Icon name="x" size={12} /></SpecValueRemove>
                          </SpecValueChip>
                        ))}
                        <SpecValueInput
                          placeholder="添加规格值"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addSpecValue(idx, (e.target as HTMLInputElement).value)
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }}
                        />
                      </>
                    )}
                  </SpecConfigRow>
                </SpecGroup>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <SmallBtn type="button" onClick={addSpec}>+ 添加规格维度</SmallBtn>
              </div>

              <VariantCardList>
                {skus.map((sku, idx) => {
                  const variantName = formatVariantName(sku.spec_values, activeSpecNames)
                  const isOnShelf = sku.shelf_status === 'on_shelf'
                  return (
                    <VariantCard key={idx}>
                      <VariantCardHeader>
                        <VariantName>{variantName}</VariantName>
                        <VariantRemoveBtn
                          type="button"
                          disabled={skus.length <= 1}
                          onClick={() => removeSKU(idx)}
                          title="移除变体"
                        >
                          <Icon name="x" size={14} />
                        </VariantRemoveBtn>
                      </VariantCardHeader>

                      <VariantMainRow>
                        <VariantField>
                          <VariantFieldLabel title="该变体的销售单价，支持两位小数">单价（元） *</VariantFieldLabel>
                          <VariantPriceInput
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={sku.price}
                            onChange={(e) => updateSKU(idx, 'price', e.target.value)}
                            onBlur={() => {
                              const raw = sku.price
                              const formatted = raw === '' || raw == null
                                ? ''
                                : Number(raw).toFixed(2)
                              if (formatted !== raw) updateSKU(idx, 'price', formatted)
                            }}
                          />
                        </VariantField>
                        <VariantField>
                          <VariantFieldLabel>Stock</VariantFieldLabel>
                          <CheckRow>
                            <CheckInput
                              type="checkbox"
                              checked={sku.track_inventory === 'true'}
                              onChange={() => updateSKU(idx, 'track_inventory', sku.track_inventory === 'true' ? 'false' : 'true')}
                            />
                            <CheckBox $checked={sku.track_inventory === 'true'}>
                              {sku.track_inventory === 'true' && <Icon name="check" size={11} />}
                            </CheckBox>
                            {t('admin.productForm.trackInventory')}
                          </CheckRow>
                          {sku.track_inventory === 'true' ? (
                            <VariantStockGroup>
                              <VariantStockBtn
                                type="button"
                                disabled={parseInt(sku.stock, 10) <= 0}
                                onMouseDown={(e) => { e.preventDefault(); startStockAdjust(idx, -1) }}
                                onMouseUp={stopStockAdjust}
                                onMouseLeave={stopStockAdjust}
                                aria-label="减少库存"
                              >
                                −
                              </VariantStockBtn>
                              <VariantStockInput
                                type="number"
                                min="0"
                                placeholder="0"
                                value={sku.stock}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  if (raw === '' || /^\d+$/.test(raw)) {
                                    updateSKU(idx, 'stock', raw === '' ? '' : String(parseInt(raw, 10)))
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = parseInt(e.target.value, 10)
                                  if (isNaN(value) || value < 0) updateSKU(idx, 'stock', '0')
                                }}
                              />
                              <VariantStockBtn
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); startStockAdjust(idx, 1) }}
                                onMouseUp={stopStockAdjust}
                                onMouseLeave={stopStockAdjust}
                                aria-label="增加库存"
                              >
                                +
                              </VariantStockBtn>
                            </VariantStockGroup>
                          ) : (
                            <NotTrackingText>{t('admin.productForm.notTracking')}</NotTrackingText>
                          )}
                        </VariantField>
                        <VariantField>
                          <VariantFieldLabel>Discount Price</VariantFieldLabel>
                          <VariantDiscountInput
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={sku.discount_price}
                            onChange={(e) => updateSKU(idx, 'discount_price', e.target.value)}
                          />
                        </VariantField>
                      </VariantMainRow>

                      <VariantMetaRow>
                        <VariantField>
                          <VariantFieldLabel>SKU Code</VariantFieldLabel>
                          <VariantMetaInput
                            type="text"
                            placeholder="e.g. TS-RED-S"
                            value={sku.sku_code || ''}
                            onChange={(e) => updateSKU(idx, 'sku_code', e.target.value)}
                          />
                        </VariantField>
                        <VariantField>
                          <VariantFieldLabel>Barcode</VariantFieldLabel>
                          <VariantMetaInput
                            type="text"
                            placeholder="e.g. 5901234123457"
                            value={sku.barcode || ''}
                            onChange={(e) => updateSKU(idx, 'barcode', e.target.value)}
                          />
                        </VariantField>
                        <VariantField>
                          <VariantFieldLabel>{t('admin.productForm.shelfStatus')}</VariantFieldLabel>
                          <CheckRow>
                            <CheckInput
                              type="checkbox"
                              checked={isOnShelf}
                              onChange={() => updateSKU(idx, 'shelf_status', isOnShelf ? 'off_shelf' : 'on_shelf')}
                            />
                            <CheckBox $checked={isOnShelf}>
                              {isOnShelf && <Icon name="check" size={11} />}
                            </CheckBox>
                            {t('admin.productForm.onShelf')}
                          </CheckRow>
                        </VariantField>
                      </VariantMetaRow>
                    </VariantCard>
                  )
                })}
              </VariantCardList>
              <VariantAddBtn type="button" onClick={addSKU}>+ {t('admin.productForm.addSku')}</VariantAddBtn>
            </SectionBody>
          </SectionCard>

          {/* ── 定时上下架 ── */}
          <SectionCard $hidden={activeSection !== 'schedule'}>
            <SectionHead>
              <StepBadge $active={activeSection === 'schedule'}>4</StepBadge>
              <SectionTitles>
                <SectionTitleText>{t('admin.productForm.schedule')}</SectionTitleText>
                <SectionDesc>{t('admin.productForm.sectionDescSchedule')}</SectionDesc>
              </SectionTitles>
            </SectionHead>
            <SectionBody>
              <Row>
                <Field>
                  <Label>{t('admin.productForm.publishAt')}</Label>
                  <Input type="datetime-local" value={publishAt} onChange={(e) => { setPublishAt(e.target.value); markDirty() }} />
                </Field>
                <Field>
                  <Label>{t('admin.productForm.unpublishAt')}</Label>
                  <Input type="datetime-local" value={unpublishAt} onChange={(e) => { setUnpublishAt(e.target.value); markDirty() }} />
                </Field>
              </Row>
            </SectionBody>
          </SectionCard>

          <Pager>
            <PagerBtn
              type="button"
              disabled={activeIndex === 0}
              onClick={() => setActiveSection(MODULE_ITEMS[activeIndex - 1].key)}
            >
              <Icon name="chevron-left" size={14} />
              {t('admin.productForm.prevSection')}
            </PagerBtn>
            <PagerSpacer />
            <PagerBtn
              type="button"
              disabled={activeIndex === MODULE_ITEMS.length - 1}
              onClick={() => setActiveSection(MODULE_ITEMS[activeIndex + 1].key)}
            >
              {t('admin.productForm.nextSection')}
              <Icon name="chevron-right" size={14} />
            </PagerBtn>
          </Pager>
        </MainCol>

        {/* ── 左侧状态栏：紧凑导航 + 概览 ── */}
        <SideRail>
          <SideCard>
            <SideCardHead>
              <SideCardIcon><Icon name="grid" size={13} /></SideCardIcon>
              <SideCardTitle>{t('admin.productForm.sidebarSections')}</SideCardTitle>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: Color.text.muted, fontWeight: 600 }}>
                {MODULE_ITEMS.filter((i) => sectionState(i.key) !== 'todo').length}/{MODULE_ITEMS.length}
              </span>
            </SideCardHead>
            <SectionNav>
              {MODULE_ITEMS.map((item, i) => {
                const st = sectionState(item.key)
                const isActive = activeSection === item.key
                return (
                  <SectionNavItem
                    key={item.key}
                    type="button"
                    $active={isActive}
                    onClick={() => setActiveSection(item.key)}
                  >
                    <NavMark $state={st}>
                      {st === 'done' ? <Icon name="check" size={9} /> : i + 1}
                    </NavMark>
                    <NavLabel>
                      {item.label}
                      {item.required && <RequiredDot>*</RequiredDot>}
                    </NavLabel>
                  </SectionNavItem>
                )
              })}
            </SectionNav>
            <SummaryGrid>
              <SummaryRow>
                <SummaryLabel>{t('admin.productForm.summaryType')}</SummaryLabel>
                <SummaryValue>{kindLabel}</SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>{t('admin.productForm.summaryBrand')}</SummaryLabel>
                <SummaryValue>{brandName}</SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>{t('admin.productForm.summaryCategory')}</SummaryLabel>
                <SummaryValue>{categoryName}</SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>{t('admin.productForm.summaryVariants')}</SummaryLabel>
                <SummaryValue>{skus.length}</SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>{t('admin.productForm.summaryStock')}</SummaryLabel>
                <SummaryValue>{totalStock}</SummaryValue>
              </SummaryRow>
            </SummaryGrid>
          </SideCard>
        </SideRail>
      </Layout>
    </Container>
  )
}
