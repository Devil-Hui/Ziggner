import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, FontSize, Radius } from '../../../theme/tokens'
import { useTranslation } from '../../../i18n'
import { useCurrency, CURRENCIES } from '../../../store/CurrencyContext'

const Wrapper = styled.footer`
  background: ${Color.bg.dark};
  color: #cfcfcf;
  margin-top: 48px;
  padding: 40px 20px 24px;
  font-size: ${FontSize.sm}px;
`

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr) 1.2fr;
  gap: 32px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const ColTitle = styled.h4`
  color: #fff;
  font-size: ${FontSize.md}px;
  margin: 0 0 14px;
  font-weight: 600;
`

const Link = styled.button`
  display: block;
  background: none;
  border: none;
  padding: 6px 0;
  color: #cfcfcf;
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  text-align: left;
  &:hover { color: #fff; }
`

const Bottom = styled.div`
  max-width: 1200px;
  margin: 28px auto 0;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  color: #9a9a9a;
`

const SwitchRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`

const DropWrap = styled.div`position: relative;`

const Menu = styled.div<{ $show: boolean }>`
  display: ${({ $show }) => ($show ? 'block' : 'none')};
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: #fff;
  color: ${Color.text.body};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  min-width: 130px;
  padding: 6px 0;
  z-index: 1200;
`

const MenuItem = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 8px 14px;
  font-size: ${FontSize.sm}px;
  text-align: left;
  color: ${({ $active }) => ($active ? Color.text.primary : Color.text.body)};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  cursor: pointer;
  &:hover { background: ${Color.bg.page}; }
`

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥' }

export default function Footer() {
  const { t, lang, setLang } = useTranslation()
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()
  const [showLang, setShowLang] = useState(false)
  const [showCur, setShowCur] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const curRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false)
      if (curRef.current && !curRef.current.contains(e.target as Node)) setShowCur(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const go = (path: string) => () => navigate(path)

  return (
    <Wrapper>
      <Inner>
        <div>
          <ColTitle>{t('store.footer.shop')}</ColTitle>
          <Link onClick={go('/category')}>{t('store.footer.categories')}</Link>
          <Link onClick={go('/profile')}>{t('store.footer.ordersReturns')}</Link>
          <Link onClick={go('/download')}>{t('store.footer.downloadApp')}</Link>
        </div>
        <div>
          <ColTitle>{t('store.footer.company')}</ColTitle>
          <Link onClick={go('/about')}>{t('store.footer.about')}</Link>
        </div>
        <div>
          <ColTitle>{t('store.footer.support')}</ColTitle>
          <Link onClick={go('/support')}>{t('store.footer.helpCenter')}</Link>
          <Link onClick={go('/support')}>{t('store.footer.contact')}</Link>
        </div>
        <div>
          <ColTitle>{t('store.footer.legal')}</ColTitle>
          <Link onClick={go('/about#privacy')}>{t('store.footer.privacy')}</Link>
          <Link onClick={go('/about#terms')}>{t('store.footer.terms')}</Link>
        </div>
        <div>
          <ColTitle>{t('store.footer.followUs')}</ColTitle>
          <SwitchRow>
            <DropWrap ref={langRef}>
              <Link onClick={() => setShowLang((v) => !v)}>{t('store.footer.language')}: {lang === 'zh-CN' ? '中文' : 'EN'}</Link>
              <Menu $show={showLang}>
                <MenuItem $active={lang === 'en-US'} onClick={() => { setLang('en-US'); setShowLang(false) }}>English (EN)</MenuItem>
                <MenuItem $active={lang === 'zh-CN'} onClick={() => { setLang('zh-CN'); setShowLang(false) }}>中文 (CN)</MenuItem>
              </Menu>
            </DropWrap>
            <DropWrap ref={curRef}>
              <Link onClick={() => setShowCur((v) => !v)}>{t('store.footer.currency')}: {SYMBOL[currency]} {currency}</Link>
              <Menu $show={showCur}>
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} $active={c === currency} onClick={() => { setCurrency(c); setShowCur(false) }}>
                    {SYMBOL[c]} {c}
                  </MenuItem>
                ))}
              </Menu>
            </DropWrap>
          </SwitchRow>
        </div>
      </Inner>
      <Bottom>
        <span>© {new Date().getFullYear()} Ziggner. {t('store.footer.allRights')}</span>
      </Bottom>
    </Wrapper>
  )
}
