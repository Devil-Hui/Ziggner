import { useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { Font, Ink, Radius, Type, Ease, mq } from '../editorial'
import { useCart } from '../../../store/CartContext'

/**
 * 落地页导航 —— like 的 sticky 细线导航。
 * 64px 高、白底 95% + 背景模糊、底部 1px 细线；
 * 滚动超过 40px 收窄并加毛玻璃，向下滚动隐藏、向上即时返回。
 *
 * 与全站 Navigation 统一规范：
 *  - 顶部分类项：Product / For Creators / How it works / For Brands
 *  - 锚点统一用 /# 绝对路径（任意路由下均可跳回首页锚点）
 *  - 购物车接入真实数量徽章（useCart）
 */
const Bar = styled.header<{ $condensed: boolean; $hidden: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-inline: clamp(1.25rem, 4vw, 4.5rem);
  background: ${p => (p.$condensed ? 'rgba(255, 255, 255, 0.95)' : 'transparent')};
  backdrop-filter: ${p => (p.$condensed ? 'blur(14px)' : 'none')};
  border-bottom: 1px solid ${p => (p.$condensed ? Ink.rule : 'transparent')};
  transition: transform 0.45s ${Ease.cinema}, background 0.45s ${Ease.cinema},
    border-color 0.45s ${Ease.cinema};
  ${p =>
    p.$hidden &&
    css`
      transform: translateY(-101%);
    `}
`

const Logo = styled.a`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  text-decoration: none;
  flex-shrink: 0;
`

const LogoMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${Radius.md}px;
  background: ${Ink.black};
  color: ${Ink.paper};

  svg {
    width: 16px;
    height: 16px;
  }
`

const LogoText = styled.span`
  font-family: ${Font.display};
  font-weight: 800;
  font-size: 1.05rem;
  ${Type.tight}
  color: ${Ink.black};
`

const Links = styled.nav`
  display: none;
  align-items: center;
  gap: 2.25rem;

  ${mq.lgUp} {
    display: flex;
  }
`

const Link = styled.a`
  font-family: ${Font.body};
  font-size: 0.84rem;
  font-weight: 500;
  color: ${Ink.graphite};
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: ${Ink.black};
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
`

const Login = styled.a`
  display: none;
  font-family: ${Font.body};
  font-size: 0.84rem;
  font-weight: 600;
  color: ${Ink.graphite};
  text-decoration: none;
  transition: color 0.2s ease;

  ${mq.smUp} {
    display: inline;
  }

  &:hover {
    color: ${Ink.black};
  }
`

const Cta = styled.a`
  display: inline-flex;
  align-items: center;
  border-radius: ${Radius.full}px;
  background: ${Ink.black};
  color: ${Ink.paper};
  font-family: ${Font.body};
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  padding: 0.6rem 1.15rem;
  white-space: nowrap;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: #000;
    transform: translateY(-1px);
  }
`

/** 购物车数量徽章 —— 与全站 Navigation 保持一致 */
const CartBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 4px;
  border-radius: 999px;
  background: ${Ink.brand};
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
  vertical-align: middle;
`

const NAV_LINKS = [
  { label: 'Product', href: '/#optimizer' },
  { label: 'For Creators', href: '/#paths' },
  { label: 'How it works', href: '/#journey' },
  { label: 'For Brands', href: '/#monetize' },
]

/** 商城入口：从品牌落地页进入实际购物流程 */
const SHOP_LINKS = [
  { label: 'Shop', href: '/category' },
  { label: 'Cart', href: '/cart' },
]

export default function EditorialNav() {
  const [condensed, setCondensed] = useState(false)
  const [hidden, setHidden] = useState(false)
  const { count } = useCart()

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setCondensed(y > 40)
      // 向下滚动且已过首屏 → 收起；向上滚动 → 立即优雅返回
      const goingDown = y > last && y > 320
      setHidden(goingDown)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <Bar $condensed={condensed} $hidden={hidden}>
      <Logo href="#top">
        <LogoMark aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path d="M3 2.5h3.2l2.4 7.2 2.4-7.2H14L9.9 13.5H6.6z" fill={Ink.paper} />
            <circle cx="13" cy="3.4" r="1.6" fill={Ink.brand} />
          </svg>
        </LogoMark>
        <LogoText>Ziggner</LogoText>
      </Logo>

      <Links>
        {NAV_LINKS.map(l => (
          <Link key={l.label} href={l.href}>
            {l.label}
          </Link>
        ))}
      </Links>

      <Actions>
        {SHOP_LINKS.map(l => (
          <Link key={l.label} href={l.href}>
            {l.label}
            {l.href === '/cart' && count > 0 && <CartBadge>{count}</CartBadge>}
          </Link>
        ))}
        <Login href="/auth?tab=login">Log in</Login>
        <Cta href="/category">Shop now</Cta>
      </Actions>
    </Bar>
  )
}
