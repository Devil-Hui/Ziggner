// TypeScript strict mode enabled
import { useState, useRef, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, Transition } from '../../theme/tokens'
import { SecondaryBtn, PrimaryBtn } from '../../components/admin/common/ui'
import { adminAPI, type CategoryNode } from '../../api/admin'
import { post } from '../../api/request'
import PageHeader from '../../components/admin/common/PageHeader'
import ErrorRetry from '../../components/admin/common/ErrorRetry'
import { useTranslation } from '../../i18n'

// ── Styled Components ──

const PageContainer = styled.div`
  padding: 0;
`

const Card = styled.div`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  padding: ${Spacing.xxl}px;
`

const UploadArea = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed ${({ $isDragging }) => ($isDragging ? Color.primary : '#ddd')};
  border-radius: 6px;
  padding: 48px 24px;
  text-align: center;
  background: ${({ $isDragging }) => ($isDragging ? '#f5f5f5' : '#f5f5f5')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${Color.primary};
    background: ${Color.primaryLight};
  }
`

const UploadIcon = styled.div`
  font-size: 40px;
  margin-bottom: 12px;
  color: ${Color.border.dark};
`

const UploadTitle = styled.p`
  font-size: ${FontSize.md}px;
  color: ${Color.primaryHover};
  margin: 0 0 6px 0;
  font-weight: 500;
`

const UploadHint = styled.p`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin: 0;
`

const HiddenInput = styled.input`
  display: none;
`

const ParsingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
`

const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${Color.border.light};
  border-top-color: ${Color.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const ParsingText = styled.p`
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  margin: 0;
`

const PreviewSection = styled.div`
  margin-top: 20px;
`

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const PreviewTitle = styled.h3`
  font-size: ${FontSize.base}px;
  font-weight: 600;
  color: ${Color.primaryHover};
  margin: 0;
`

const PreviewCount = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  background: ${Color.primaryLight};
  padding: 2px 10px;
  border-radius: 10px;
`

const PreviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${FontSize.xs}px;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
`

const PreviewTh = styled.th`
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: #8a8175;
  background: rgba(26, 23, 18, 0.03);
  border-bottom: 1px solid ${Color.border.light};
  white-space: nowrap;
  font-size: ${FontSize.xs}px;
`

const PreviewTd = styled.td`
  padding: 8px 12px;
  color: ${Color.primaryHover};
  border-bottom: 1px solid ${Color.border.light};
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PreviewWrapper = styled.div`
  max-height: 360px;
  overflow: auto;
`

const ImportingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
`

const ImportingText = styled.p`
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  margin: 0 0 4px 0;
`

const ImportingSubText = styled.p`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin: 0;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`

const ResultCard = styled.div<{ $success: boolean }>`
  padding: 20px 24px;
  border-radius: ${Radius.sm}px;
  background: ${({ $success }) => ($success ? '#e8f5e9' : '#fde8e8')};
  border: 1px solid ${({ $success }) => ($success ? '#c8e6c9' : '#f5c6cb')};
  margin-top: 20px;
  text-align: center;
`

const ResultTitle = styled.p<{ $success: boolean }>`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${({ $success }) => ($success ? '#2e7d32' : '#c62828')};
  margin: 0 0 8px 0;
`

const ResultMessage = styled.p`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin: 0 0 12px 0;
`

// ── 品牌/分类选择 ──

const OptionsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.div`
  margin-bottom: 0;
`

const Label = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: 6px;
`

const Select = styled.select`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.base}px;
  box-sizing: border-box;
  color: ${Color.text.body};
  background: ${Color.bg.card};
`

// ── 图片文件夹上传 ─────────────────

const MediaArea = styled.div`
  border: 1px dashed ${Color.border.medium};
  border-radius: 6px;
  padding: 20px;
  margin-top: 16px;
  text-align: center;
  cursor: pointer;
  background: rgba(26, 23, 18, 0.02);

  &:hover {
    border-color: ${Color.primary};
  }
`

const MediaHint = styled.p`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin: 6px 0 0 0;
`

const MediaSummary = styled.div`
  margin-top: 12px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  text-align: left;
`

const ImageArea = styled.div`
  border: 1px dashed ${Color.border.medium};
  border-radius: 6px;
  padding: 20px;
  margin-top: 16px;
  text-align: center;
  cursor: pointer;
  background: rgba(26, 23, 18, 0.02);

  &:hover {
    border-color: ${Color.primary};
  }
`

// ── Types ──

type PageState = 'upload' | 'parsing' | 'preview' | 'importing' | 'result'

interface PreviewRow {
  row: number
  name: string
  model: string
  price: string
  discount_price: string
  sku_code: string
  description: string
  tags: string[]
  valid: boolean
  errors: string[]
}

interface BrandOption { id: number; name: string }
interface CategoryOption { id: number; name: string; level: number }

// ── Component ──

export default function AdminImport() {
  const { t } = useTranslation()
  const [pageState, setPageState] = useState<PageState>('upload')
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // 品牌/分类
  const [brands, setBrands] = useState<CategoryOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  // 图片文件夹
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageDirName, setImageDirName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // 加载品牌/分类
  const loadOptions = useCallback(async () => {
    try {
      const b = (await adminAPI.getBrands()) as unknown as CategoryOption[]
      setBrands(Array.isArray(b) ? b : [])
      const c = (await adminAPI.getCategoryTree()) as unknown as CategoryNode[]
      const flat: CategoryOption[] = []
      const walk = (nodes: CategoryNode[], level: number) => {
        nodes.forEach((n) => {
          flat.push({ id: n.id, name: n.name, level })
          if (n.children?.length) walk(n.children, level + 1)
        })
      }
      if (Array.isArray(c)) walk(c, 1)
      setCategories(flat)
    } catch { /* ignore */ }
  }, [])

  // 挂载时加载品牌/分类
  useEffect(() => { loadOptions() }, [loadOptions])

  // ── File Parsing ──

  const handleFile = useCallback(async (selectedFile: File) => {
    setFileName(selectedFile.name)
    setFile(selectedFile)
    setPageState('parsing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('preview', 'true')
      const res = (await post('/goods/spu/import/', formData)) as {
        preview: PreviewRow[]
        total_rows: number
        valid_rows: number
        error_count: number
        errors: string[]
      }

      if (!res.preview || res.preview.length === 0) {
        setError(t('admin.dataImport.noDataRows'))
        setPageState('upload')
        return
      }

      setPreviewData(res.preview)
      setPageState('preview')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('admin.dataImport.parseFailed'))
      setPageState('upload')
    }
  }, [t])

  // ── Drag & Drop ──

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  // ── 图片文件夹上传 ──

  const handleImageDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setImageFiles(files)
    setImageDirName(files[0].webkitRelativePath?.split('/')[0] || '')
  }

  // ── Import ──

  const handleImport = async () => {
    if (!file) return
    if (!brandId) { setError(t('admin.dataImport.brandRequired')); return }
    if (!categoryId) { setError(t('admin.dataImport.categoryRequired')); return }
    setPageState('importing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('brand_id', brandId)
      formData.append('category_id', categoryId)
      // 图片文件夹：按商品名对应，文件名前缀匹配商品名
      imageFiles.forEach((f) => {
        formData.append('images', f, f.webkitRelativePath || f.name)
      })
      const res = (await post('/goods/spu/import/', formData)) as { message?: string; imported?: number; errors?: string[] }

      setResult({
        success: true,
        message: res.message || t('admin.dataImport.importCreated').replace('{task_id}', String(res.imported ?? 0)),
      })
      setPageState('result')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('admin.dataImport.importFailed')
      setResult({ success: false, message })
      setPageState('result')
    }
  }

  const handleReset = () => {
    setPageState('upload')
    setFileName('')
    setPreviewData([])
    setFile(null)
    setError(null)
    setResult(null)
    setImageFiles([])
    setImageDirName('')
  }

  // ── Render ──

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.dataImport.title')}
        breadcrumb={[{ label: t('admin.dataImport.subtitle') }, { label: t('admin.dataImport.title') }]}
      />

      <Card>
        {/* Upload Area */}
        {pageState === 'upload' && (
          <UploadArea
            $isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
          >
            <UploadIcon>Import</UploadIcon>
            <UploadTitle>{t('admin.dataImport.dropZone')}</UploadTitle>
            <UploadHint>{t('admin.dataImport.supportedFormats')}</UploadHint>
            <HiddenInput
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
          </UploadArea>
        )}

        {/* Parsing */}
        {pageState === 'parsing' && (
          <ParsingOverlay>
            <Spinner />
            <ParsingText>{t('admin.dataImport.parsing').replace('{fileName}', fileName)}</ParsingText>
          </ParsingOverlay>
        )}

        {/* Preview */}
        {pageState === 'preview' && (
          <PreviewSection>
            <PreviewHeader>
              <PreviewTitle>
                {t('admin.dataImport.dataPreview').replace('{fileName}', fileName)}
              </PreviewTitle>
              <PreviewCount>{t('admin.dataImport.totalRecords').replace('{count}', String(previewData.length))}</PreviewCount>
            </PreviewHeader>

            {/* 品牌/分类选择 */}
            <OptionsRow>
              <Field>
                <Label>{t('admin.productForm.brand')} *</Label>
                <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">{t('admin.productForm.selectBrand')}</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field>
                <Label>{t('admin.productForm.category')} *</Label>
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">{t('admin.productForm.selectCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ paddingLeft: `${c.level * 12}px` }}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </OptionsRow>

            <PreviewWrapper>
              <PreviewTable>
                <thead>
                  <tr>
                    <PreviewTh style={{ width: 40 }}>#</PreviewTh>
                    <PreviewTh>{t('admin.productForm.productName')}</PreviewTh>
                    <PreviewTh>{t('admin.dataImport.model')}</PreviewTh>
                    <PreviewTh>{t('admin.dataImport.price')}</PreviewTh>
                    <PreviewTh>{t('admin.dataImport.discountPrice')}</PreviewTh>
                    <PreviewTh>{t('admin.dataImport.skuCode')}</PreviewTh>
                    <PreviewTh>{t('admin.dataImport.tags')}</PreviewTh>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 50).map((row, idx) => (
                    <tr key={idx}>
                      <PreviewTd style={{ color: '#999' }}>{row.row}</PreviewTd>
                      <PreviewTd>{row.name}</PreviewTd>
                      <PreviewTd>{row.model}</PreviewTd>
                      <PreviewTd>{row.price}</PreviewTd>
                      <PreviewTd>{row.discount_price}</PreviewTd>
                      <PreviewTd>{row.sku_code}</PreviewTd>
                      <PreviewTd>{(row.tags || []).slice(0, 2).join(' · ')}</PreviewTd>
                    </tr>
                  ))}
                </tbody>
              </PreviewTable>
            </PreviewWrapper>
            {previewData.length > 50 && (
              <p style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>
                {t('admin.dataImport.previewLimit').replace('{count}', String(previewData.length))}
              </p>
            )}

            {/* 图片文件夹上传 */}
            <ImageArea
              onClick={() => imageInputRef.current?.click()}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>🖼️</div>
              <div style={{ fontSize: FontSize.sm, color: Color.primaryHover, fontWeight: 500 }}>
                {imageDirName ? t('admin.dataImport.imageDirSelected') : t('admin.dataImport.imageDirUpload')}
              </div>
              <MediaHint>{t('admin.dataImport.imageDirHint')}</MediaHint>
              {imageFiles.length > 0 && (
                <MediaSummary>
                  {t('admin.dataImport.imageCount').replace('{count}', String(imageFiles.length))}
                </MediaSummary>
              )}
              <HiddenInput
                ref={imageInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                onChange={handleImageDirChange}
              />
            </ImageArea>

            <ButtonRow>
              <PrimaryBtn onClick={handleImport}>{t('admin.dataImport.confirmImport')}</PrimaryBtn>
              <SecondaryBtn onClick={handleReset}>{t('admin.dataImport.reselectFile')}</SecondaryBtn>
            </ButtonRow>
          </PreviewSection>
        )}

        {/* Importing */}
        {pageState === 'importing' && (
          <ImportingOverlay>
            <Spinner />
            <ImportingText>{t('admin.dataImport.importing')}</ImportingText>
            <ImportingSubText>{t('admin.dataImport.importingCount').replace('{count}', String(previewData.length))}</ImportingSubText>
          </ImportingOverlay>
        )}

        {/* Result */}
        {pageState === 'result' && result && (
          <>
            <ResultCard $success={result.success}>
              <ResultTitle $success={result.success}>
                {result.success ? t('admin.dataImport.importSuccess') : t('admin.dataImport.importFailedStatus')}
              </ResultTitle>
              <ResultMessage>{result.message}</ResultMessage>
              <PrimaryBtn onClick={handleReset}>{t('admin.dataImport.continueImport')}</PrimaryBtn>
            </ResultCard>
          </>
        )}

        {/* Error */}
        {error && pageState === 'upload' && (
          <div style={{ marginTop: 16 }}>
            <ErrorRetry message={t('admin.dataImport.parseError')} detail={error} onRetry={handleReset} />
          </div>
        )}
      </Card>
    </PageContainer>
  )
}