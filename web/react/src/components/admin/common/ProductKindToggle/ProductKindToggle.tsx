/**
 * ProductKindToggle — 实体/虚拟商品开关组件。
 *
 * 点击切换 physical ↔ virtual，通过 onChange 回调通知父组件。
 * 视觉为 Toggle Switch（滑块动画 + 选中态高亮）。
 */
import * as S from './ProductKindToggle.styles'
import { useTranslation } from '@/i18n'

export interface ProductKindToggleProps {
  /** 当前值 */
  value: 'physical' | 'virtual'
  /** 切换回调 */
  onChange: (value: 'physical' | 'virtual') => void
}

export default function ProductKindToggle({ value, onChange }: ProductKindToggleProps) {
  const { t } = useTranslation()
  const isVirtual = value === 'virtual'

  const toggle = () => {
    onChange(isVirtual ? 'physical' : 'virtual')
  }

  return (
    <S.Wrap>
      <S.Label $active={!isVirtual} onClick={toggle}>
        {t('admin.productKind.physical')}
      </S.Label>
      <S.Switch
        type="button"
        $isVirtual={isVirtual}
        onClick={toggle}
        role="switch"
        aria-checked={isVirtual}
        aria-label={t('admin.productKind.toggle')}
      >
        <S.Knob $isVirtual={isVirtual} />
      </S.Switch>
      <S.Label $active={isVirtual} onClick={toggle}>
        {t('admin.productKind.virtual')}
      </S.Label>
      {isVirtual && <S.Hint>{t('admin.productKind.virtualHint')}</S.Hint>}
    </S.Wrap>
  )
}
