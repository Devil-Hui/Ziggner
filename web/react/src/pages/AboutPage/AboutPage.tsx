// TypeScript strict mode enabled
import React from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Transition } from '../../theme/tokens'

// ==================== 样式组件 ====================

/** 页面容器 */
const AboutContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  font-family: inherit;
  color: ${Color.primaryHover};
  line-height: 1.7;
`

/** 页面标题 */
const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${Color.border.light};
`

/** 内容区块 */
const Section = styled.section`
  margin-bottom: 40px;
`

/** 区块标题 */
const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: 16px;
`

/** 段落文字 */
const Paragraph = styled.p`
  font-size: 1rem;
  color: ${Color.text.body};
  margin-bottom: 12px;
`

/** 链接列表 */
const LinkList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`

/** 链接项 */
const LinkItem = styled.li`
  margin-bottom: 12px;
`

/** 链接样式 */
const StyledLink = styled(Link)`
  color: #1a73e8;
  text-decoration: none;
  font-size: 1rem;
  transition: color ${Transition.normal};

  &:hover {
    color: #1557b0;
    text-decoration: underline;
  }
`

// ==================== 组件 ====================

/**
 * AboutPage - 关于页面
 *
 * 包含：
 * - About Ziggner 公司介绍
 * - Privacy Policy 隐私政策
 * - Terms of Service 服务条款
 * - Help & Support 帮助与支持
 */
const AboutPage: React.FC = () => {
  return (
    <AboutContainer>
      <PageTitle>About Us</PageTitle>

      {/* About Ziggner 内容 */}
      <Section>
        <SectionTitle>About Ziggner</SectionTitle>
        <Paragraph>
          Ziggner is a leading enterprise e-commerce platform dedicated to providing
          high-quality products and exceptional service to businesses worldwide. Founded
          with a vision to simplify B2B procurement, we connect manufacturers, distributors,
          and retailers through our innovative digital marketplace.
        </Paragraph>
        <Paragraph>
          Our platform offers a comprehensive catalog of products across multiple categories,
          competitive pricing, and streamlined logistics solutions. We believe in making
          business procurement as easy as online shopping.
        </Paragraph>
        <Paragraph>
          With a commitment to quality, reliability, and customer satisfaction, Ziggner
          continues to expand its reach and improve its technology to serve the evolving
          needs of modern enterprises.
        </Paragraph>
      </Section>

      {/* Privacy Policy */}
      <Section>
        <SectionTitle>Privacy Policy</SectionTitle>
        <Paragraph>
          Your privacy is important to us. Our Privacy Policy outlines how we collect,
          use, and protect your personal information when you use our platform. We are
          committed to maintaining the confidentiality and security of your data.
        </Paragraph>
        <LinkList>
          <LinkItem>
            <StyledLink to="/privacy-policy">
              View full Privacy Policy
            </StyledLink>
          </LinkItem>
        </LinkList>
      </Section>

      {/* Terms of Service */}
      <Section>
        <SectionTitle>Terms of Service</SectionTitle>
        <Paragraph>
          By using the Ziggner platform, you agree to our Terms of Service. These terms
          govern your use of our website, your account, purchases, and interactions
          with other users and sellers on our marketplace.
        </Paragraph>
        <LinkList>
          <LinkItem>
            <StyledLink to="/terms-of-service">
              View full Terms of Service
            </StyledLink>
          </LinkItem>
        </LinkList>
      </Section>

      {/* Help & Support */}
      <Section>
        <SectionTitle>Help &amp; Support</SectionTitle>
        <Paragraph>
          Need assistance? Our support team is here to help you with any questions
          about orders, shipping, returns, or account management.
        </Paragraph>
        <LinkList>
          <LinkItem>
            <StyledLink to="/help">
              Help Center
            </StyledLink>
          </LinkItem>
          <LinkItem>
            <StyledLink to="/contact">
              Contact Us
            </StyledLink>
          </LinkItem>
          <LinkItem>
            <StyledLink to="/faq">
              Frequently Asked Questions
            </StyledLink>
          </LinkItem>
        </LinkList>
      </Section>
    </AboutContainer>
  )
}

export default AboutPage