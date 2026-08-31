import styled, { css } from 'styled-components'
import { Ink, Elevation, Font } from '../../editorial'

/**
 * TikTok 风格手机模型 — 竖版视频 + 右侧互动栏（喜欢/评论/收藏/分享）。
 * 纯 CSS 绘制手机外壳，画面用实拍图，互动栏模拟 TikTok 的 UI 惯例。
 * 通过 props 可配置图片、底部信息与互动数据，供 Hero / Optimizer 复用。
 */

export interface TikTokPhoneProps {
  /** 竖版画面图片 */
  src: string
  alt?: string
  /** 底部用户名 */
  handle?: string
  /** 视频描述 */
  caption?: string
  /** 音乐行 */
  music?: string
  /** 喜欢数 */
  likes?: string
  /** 评论数 */
  comments?: string
  /** 收藏数 */
  bookmarks?: string
  /** 分享数 */
  shares?: string
  /** 原始素材（变暗、降饱和，用于 Before 对比） */
  dim?: boolean
  /** 高亮（淡蓝光晕 + 微放大，用于 After 对比） */
  highlight?: boolean
  /** 手机宽度上限 */
  width?: number
  className?: string
}

/* ── 手机外壳 ───────────────────────────────────────────── */
const Shell = styled.div<{ $width: number; $highlight?: boolean }>`
  position: relative;
  width: 100%;
  max-width: ${p => p.$width}px;
  margin-inline: auto;
  padding: 10px;
  border-radius: 44px;
  background: ${Ink.near};
  box-shadow: ${Elevation.float}, inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  ${p =>
    p.$highlight &&
    css`
      transform: scale(1.05);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18),
        0 24px 48px rgba(59, 130, 246, 0.22), ${Elevation.float};
    `}
`

const Screen = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 36px;
  overflow: hidden;
  background: ${Ink.near};
`

const Video = styled.img<{ $dim?: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  ${p =>
    p.$dim &&
    css`
      filter: grayscale(0.4) brightness(0.85);
    `}
`

/** 屏幕玻璃反光 */
const Glare = styled.span`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0) 38%,
    rgba(255, 255, 255, 0) 100%
  );
`

/** 刘海 */
const Notch = styled.span`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 64px;
  height: 20px;
  border-radius: 999px;
  background: ${Ink.black};
  z-index: 4;
`

/* ── 右侧互动栏（TikTok 惯例） ──────────────────────────── */
const Actions = styled.div`
  position: absolute;
  right: 10px;
  bottom: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 4;
`

const Action = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
`

const ActionBtn = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;

  svg {
    width: 20px;
    height: 20px;
  }
`

const ActionCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
`

/* ── 底部信息（TikTok 惯例） ────────────────────────────── */
const Info = styled.div`
  position: absolute;
  left: 12px;
  right: 64px;
  bottom: 20px;
  z-index: 4;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
`

const Handle = styled.div`
  font-family: ${Font.display};
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
`

const Caption = styled.p`
  font-size: 11px;
  line-height: 1.5;
  margin: 0 0 6px;
  opacity: 0.95;
`

const Music = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  opacity: 0.9;

  svg {
    width: 12px;
    height: 12px;
  }
`

/* ── 图标 ───────────────────────────────────────────────── */
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 4.5 6.2 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.8 0 5.8 4.1 4.2 7.2C19.5 16.3 12 21 12 21z" />
  </svg>
)

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12z" />
  </svg>
)

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </svg>
)

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <path d="M12 3v13M7 8l5-5 5 5" />
  </svg>
)

const MusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

/* ── 组件 ───────────────────────────────────────────────── */
export default function TikTokPhone({
  src,
  alt = '',
  handle = '@creator',
  caption = '',
  music = 'original sound',
  likes,
  comments,
  bookmarks,
  shares,
  dim,
  highlight,
  width = 300,
  className,
}: TikTokPhoneProps) {
  return (
    <Shell $width={width} $highlight={highlight} className={className} data-phone-shell>
      <Screen>
        <Video src={src} alt={alt} $dim={dim} loading="lazy" />
        <Glare />
        <Notch />

        <Actions>
          <Action>
            <ActionBtn>
              <HeartIcon />
            </ActionBtn>
            <ActionCount>{likes ?? '—'}</ActionCount>
          </Action>
          <Action>
            <ActionBtn>
              <CommentIcon />
            </ActionBtn>
            <ActionCount>{comments ?? '—'}</ActionCount>
          </Action>
          <Action>
            <ActionBtn>
              <BookmarkIcon />
            </ActionBtn>
            <ActionCount>{bookmarks ?? '—'}</ActionCount>
          </Action>
          <Action>
            <ActionBtn>
              <ShareIcon />
            </ActionBtn>
            <ActionCount>{shares ?? 'Share'}</ActionCount>
          </Action>
        </Actions>

        <Info>
          <Handle>{handle}</Handle>
          {caption ? <Caption>{caption}</Caption> : null}
          <Music>
            <MusicIcon /> {music}
          </Music>
        </Info>
      </Screen>
    </Shell>
  )
}