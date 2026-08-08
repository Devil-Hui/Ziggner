import React from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Transition } from '../../theme/tokens'

const AboutContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  font-family: inherit;
  color: ${Color.primaryHover};
  line-height: 1.7;
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid ${Color.border.light};
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.9rem;
  color: ${Color.text.body};
  cursor: pointer;
  margin-bottom: 24px;
  transition: all ${Transition.normal};

  &:hover {
    background: ${Color.bg.page};
    color: ${Color.primaryHover};
  }
`

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${Color.border.light};
`

const Section = styled.section`
  margin-bottom: 40px;
`

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: 16px;
`

const Paragraph = styled.p`
  font-size: 1rem;
  color: ${Color.text.body};
  margin-bottom: 12px;
`

const StyledAnchor = styled.a`
  color: #1a73e8;
  text-decoration: none;
  font-size: 1rem;
  transition: color ${Transition.normal};

  &:hover {
    color: #1557b0;
    text-decoration: underline;
  }
`

const AboutPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <AboutContainer>
      <BackButton onClick={() => navigate(-1)}>
        ← Back
      </BackButton>

      <PageTitle>About Us</PageTitle>

      <Section id="about">
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

      <Section id="privacy">
        <SectionTitle>Privacy Policy</SectionTitle>
        <Paragraph>
          Your privacy is important to us. Our Privacy Policy outlines how we collect,
          use, and protect your personal information when you use our platform. We are
          committed to maintaining the confidentiality and security of your data.
        </Paragraph>
        <Paragraph>
          We collect only the information necessary to provide our services, including
          account details, transaction records, and communication preferences. We never
          sell your personal data to third parties.
        </Paragraph>
        <StyledAnchor href="#privacy">↑ Read Privacy Policy</StyledAnchor>
      </Section>

      <Section id="terms">
        <SectionTitle>Terms of Service</SectionTitle>
        <Paragraph>
          By using the Ziggner platform, you agree to our Terms of Service. These terms
          govern your use of our website, your account, purchases, and interactions
          with other users and sellers on our marketplace.
        </Paragraph>
        <Paragraph>
          Users must be at least 18 years old and provide accurate information when
          creating an account. We reserve the right to suspend accounts that violate
          our community guidelines or engage in fraudulent activity.
        </Paragraph>
        <StyledAnchor href="#terms">↑ Read Terms of Service</StyledAnchor>
      </Section>

      <Section id="help">
        <SectionTitle>Help &amp; Support</SectionTitle>
        <Paragraph>
          Need assistance? Our support team is here to help you with any questions
          about orders, shipping, returns, or account management.
        </Paragraph>
        <Paragraph>
          Email us at support@ziggner.com or visit our Help Center for FAQs,
          tutorials, and troubleshooting guides.
        </Paragraph>
        <StyledAnchor href="#help">↑ Back to Help &amp; Support</StyledAnchor>
      </Section>
    </AboutContainer>
  )
}

export default AboutPage