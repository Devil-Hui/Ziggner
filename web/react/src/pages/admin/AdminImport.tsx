// TypeScript strict mode enabled
import { useState, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { adminAPI } from '../../api/admin'
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

// ── Upload Area ──

const UploadArea = styled.div<{ $isDragging: boolean; $hasFile: boolean }>`
  border: 2px dashed ${({ $isDragging }) => ($isDragging ? '#e74c3c' : '#ddd')};
  border-radius: 6px;
  padding: 48px 24px;
  text-align: center;
  background: ${({ $isDragging }) => ($isDragging ? '#f5f5f5' : '#f5f5f5')};
  cursor: pointer;
  transition: ${Transition.normal};

  &:hover {
    border-color: #e74c3c;
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

// ── Parsing State ──

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
  border-top-color: #e74c3c;
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

// ── Preview Table ──

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
  color: ${Color.text.secondary};
  background: ${Color.primaryLight};
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

// ── Importing State ──

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

// ── Buttons ──

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`

const PrimaryBtn = styled.button<{ $disabled?: boolean }>`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: ${({ $disabled }) => ($disabled ? '#ccc' : '#e74c3c')};
  color: ${Color.text.inverse};
  border-radius: 2px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background 0.15s;

  &:hover {
    background: ${({ $disabled }) => ($disabled ? '#ccc' : '#c0392b')};
  }
`

const SecondaryBtn = styled.button`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    border-color: ${Color.border.dark};
    color: ${Color.primaryHover};
  }
`

// ── Result ──

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

// ── Types ──

type PageState = 'upload' | 'parsing' | 'preview' | 'importing' | 'result'

interface PreviewRow {
  [key: string]: string | number
}

// ── Component ──

export default function AdminImport() {
  const { t } = useTranslation()
  const [pageState, setPageState] = useState<PageState>('upload')
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File Parsing ──

  const parseCSV = (text: string): { headers: string[]; rows: PreviewRow[] } => {
    const lines = text.trim().split('\n')
    if (lines.length === 0) return { headers: [], rows: [] }

    const headers = lines[0].split(',').map((header) => header.trim().replace(/^"|"$/g, ''))
    const rows: PreviewRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      if (values.length === 0 || values.every((v) => v === '')) continue
      const row: PreviewRow = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? ''
      })
      rows.push(row)
    }

    return { headers, rows }
  }

  const handleFile = useCallback(async (selectedFile: File) => {
    setFileName(selectedFile.name)
    setFile(selectedFile)
    setPageState('parsing')
    setError(null)

    try {
      const text = await selectedFile.text()
      const { headers, rows } = parseCSV(text)

      if (headers.length === 0) {
        setError(t('admin.dataImport.emptyFile'))
        setPageState('upload')
        return
      }

      if (rows.length === 0) {
        setError(t('admin.dataImport.noDataRows'))
        setPageState('upload')
        return
      }

      setPreviewHeaders(headers)
      setPreviewData(rows)
      setPageState('preview')
    } catch {
      setError(t('admin.dataImport.parseFailed'))
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

  // ── Import ──

  const handleImport = async () => {
    if (!file) return
    setPageState('importing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = (await post('/goods/spu/import/', formData)) as { task_id?: string; message?: string }

      setResult({
        success: true,
        message: res.message || t('admin.dataImport.importCreated').replace('{task_id}', res.task_id || '—'),
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
    setPreviewHeaders([])
    setFile(null)
    setError(null)
    setResult(null)
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
            $hasFile={false}
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
            <PreviewWrapper>
              <PreviewTable>
                <thead>
                  <tr>
                    <PreviewTh style={{ width: 40 }}>#</PreviewTh>
                    {previewHeaders.map((h) => (
                      <PreviewTh key={h}>{h}</PreviewTh>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 50).map((row, idx) => (
                    <tr key={idx}>
                      <PreviewTd style={{ color: '#999' }}>{idx + 1}</PreviewTd>
                      {previewHeaders.map((h) => (
                        <PreviewTd key={h}>{String(row[h] ?? '')}</PreviewTd>
                      ))}
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