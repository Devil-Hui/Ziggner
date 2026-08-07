import { useState } from 'react'
import { useCategories } from '../../../hooks/useProducts'
import { useNavigate } from 'react-router-dom'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import styled from 'styled-components'

const MenuBar = styled.div`
  background-color: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  padding: 0 2vw;
  position: relative;
`

const CategoryButton = styled.button`
  background: #333;
  color: white;
  padding: 1.2vh 2.5vw;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
  border: none;
  border-radius: 0;

  &:hover {
    background: #555;
  }
`

const AlphabetNav = styled.div`
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
  padding: 1vh 2vw;
  gap: 2.5vw;
  flex-grow: 1;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 10px;
  }

  span {
    font-size: 1rem;
    color: #666;
    cursor: pointer;

    &:hover {
      color: #333;
    }
  }
`

const MegaMenuPanel = styled.div<{ $active?: boolean }>`
  position: absolute;
  top: 100%;
  left: 2vw;
  width: calc(100% - 4vw);
  max-width: 1200px;
  background: white;
  box-shadow: 0 15px 35px rgba(0,0,0,0.2);
  display: ${props => props.$active ? 'grid' : 'none'};
  grid-template-columns: 200px 350px 1fr;
  height: auto;
  max-height: 450px;
  z-index: ${zIndex.dropdown};
  border-radius: 0 0 8px 8px;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    height: auto;
    max-height: 70vh;
    overflow-y: auto;
  }
`

const MenuSidebar = styled.div`
  background: #f9f9f9;
  border-right: 1px solid #eee;
  overflow-y: auto;
`

const MenuLink = styled.div`
  padding: 1.5vh 2vw;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;

  &:hover, &.active {
    background: #fff;
    color: #ff4646;
    font-weight: bold;
  }
`

const MenuSub = styled.div`
  padding: 2.5vh;
  border-right: 1px solid #f0f0f0;
  overflow-y: auto;
`

const SubGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5vw;
`

const SubGridItem = styled.div`
  text-align: center;
  cursor: pointer;
`

const SubThumb = styled.div`
  width: 60px;
  height: 60px;
  background: #f0f0f0;
  border-radius: 50%;
  margin: 0 auto 0.8vh;
`

const MenuDetail = styled.div`
  padding: 2.5vh;
  overflow-y: auto;
  background: #fff;
`

const MenuGroup = styled.div`
  margin-bottom: 3vh;
`

const MenuGroupTitle = styled.div`
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 1.5vh;
  border-bottom: 1px solid #eee;
`

const MenuTagList = styled.div`
  display: flex;
  gap: 2vw;
  flex-wrap: wrap;
`

const MenuTag = styled.div`
  text-align: center;
  width: 70px;
  cursor: pointer;

  .circle-img {
    width: 50px;
    height: 50px;
    background: #f7f7f7;
    border-radius: 50%;
    margin: 0 auto 0.5vh;
  }

  span {
    font-size: 0.85rem;
  }
`

export default function MegaMenu() {
  const navigate = useNavigate()
  const { categories: categoryTree } = useCategories()
  const { t } = useTranslation()
  const [isActive, setIsActive] = useState(false)
  const [activeLevel1, setActiveLevel1] = useState(-1)
  const [activeLevel2, setActiveLevel2] = useState(0)

  const currentCategory = activeLevel1 >= 0 ? categoryTree[activeLevel1] : null
  const currentSubCategories = currentCategory?.children || []
  const currentThirdLevel = currentSubCategories[activeLevel2]?.children || []

  const handleCategoryClick = () => {
    navigate('/category')
    setIsActive(false)
  }

  const handleOpen = () => {
    setIsActive(!isActive)
    if (!isActive) {
      setActiveLevel1(-1)
      setActiveLevel2(0)
    }
  }

  return (
    <MenuBar>
      <CategoryButton onClick={handleOpen}>
        {t('store.nav.categories')} ▾
      </CategoryButton>

      <MegaMenuPanel $active={isActive}>
        <MenuSidebar>
          {categoryTree.map((category, index) => (
            <MenuLink
              key={category.id}
              className={activeLevel1 === index ? 'active' : ''}
              onClick={() => {
                setActiveLevel1(index)
                setActiveLevel2(0)
              }}
            >
              {category.name} <span>&gt;</span>
            </MenuLink>
          ))}
        </MenuSidebar>

        <MenuSub>
          <SubGrid>
            {currentSubCategories.map((sub, index) => (
              <SubGridItem key={sub.id} onClick={() => setActiveLevel2(index)}>
                <SubThumb />
                <span>{sub.name}</span>
              </SubGridItem>
            ))}
          </SubGrid>
        </MenuSub>

        <MenuDetail>
          <MenuGroup>
              <MenuGroupTitle>{currentSubCategories[activeLevel2]?.name || ''}</MenuGroupTitle>
              <MenuTagList>
                {currentThirdLevel.map((item) => (
                  <MenuTag key={item.id} onClick={handleCategoryClick}>
                    <div className="circle-img" />
                    <span>{item.name}</span>
                  </MenuTag>
                ))}
              </MenuTagList>
            </MenuGroup>
        </MenuDetail>
      </MegaMenuPanel>

      <AlphabetNav>
        {categoryTree.map(category => (
          <span key={category.id} onClick={handleCategoryClick}>
            {category.name}
          </span>
        ))}
      </AlphabetNav>
    </MenuBar>
  )
}
