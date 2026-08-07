import styled from 'styled-components'
import { useTranslation } from './index'

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const Btn = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border: 1px solid ${({ $active }) => ($active ? '#e74c3c' : '#ddd')};
  border-radius: 4px;
  background: ${({ $active }) => ($active ? '#e74c3c' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#888')};
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.4;

  &:hover {
    border-color: #e74c3c;
    color: ${({ $active }) => ($active ? '#fff' : '#e74c3c')};
  }
`

interface LanguageSwitchProps {
  position?: 'header' | 'login'
}

export default function LanguageSwitch({ position = 'header' }: LanguageSwitchProps) {
  const { lang, setLang } = useTranslation()

  const btnColor = position === 'login' ? '#888' : undefined

  return (
    <Wrapper>
      <Btn
        $active={lang === 'en-US'}
        onClick={() => setLang('en-US')}
        style={btnColor ? { color: btnColor, borderColor: btnColor } : undefined}
      >
        EN
      </Btn>
      <Btn
        $active={lang === 'zh-CN'}
        onClick={() => setLang('zh-CN')}
        style={btnColor ? { color: btnColor, borderColor: btnColor } : undefined}
      >
        中文
      </Btn>
    </Wrapper>
  )
}