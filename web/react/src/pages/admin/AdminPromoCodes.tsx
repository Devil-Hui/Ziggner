// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { QRCodeSVG } from 'qrcode.react'
import { Color, Radius, Spacing, FontSize, FontWeight, Transition } from '../../theme/tokens'
import PageHeader from '../../components/admin/common/PageHeader'
import Modal from '../../components/admin/common/Modal'
import ConfirmDialog from '../../components/admin/common/ConfirmDialog'
import { toast } from '../../components/admin/common/Toast'
import { adminAPI, type PromoCodeItem } from '../../api/admin'
import { useTranslation } from '../../i18n'

/* ── 独立看板页：代言人券推广码统计（非弹窗） ── */

const TableScroll = styled.div`
  border: 1px solid rgba(26, 23, 18, 0.10);
  border-radius: ${Radius.md}px;
  overflow: auto;
  max-height: calc(100vh - 280px);
  background: #fff;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: ${FontSize.sm}px;

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 12px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: #8a8175;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: rgba(26, 23, 18, 0.03);
    border-bottom: 1px solid rgba(26, 23, 18, 0.10);
    white-space: nowrap;
  }

  tbody td {
    padding: 12px 16px;
    color: ${Color.text.body};
    border-bottom: 1px solid rgba(26, 23, 18, 0.06);
    font-variant-numeric: tabular-nums;
  }

  tbody tr:hover { background: rgba(26, 86, 219, 0.04); }

  /* 合计行固定底部 */
  tfoot td {
    position: sticky;
    bottom: 0;
    padding: 12px 16px;
    background: #fafafa;
    font-weight: ${FontWeight.semibold};
    border-top: 1px solid ${Color.border.medium};
    font-variant-numeric: tabular-nums;
  }
`

const Mono = styled.span`
  font-family: 'SF Mono', Consolas, monospace;
  font-size: ${FontSize.xs}px;
  letter-spacing: 0.5px;
`

const StatusPill = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: ${Radius.lg}px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $active }) => ($active ? '#ecfdf5' : '#f3f4f6')};
  color: ${({ $active }) => ($active ? '#047857' : '#6b7280')};
`

const RowBtn = styled.button<{ $tone?: 'blue' | 'danger' }>`
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid
    ${({ $tone }) => ($tone === 'blue' ? '#2d8cf0' : $tone === 'danger' ? Color.status.error : Color.border.medium)};
  background: #fff;
  color: ${({ $tone }) => ($tone === 'blue' ? '#2d8cf0' : $tone === 'danger' ? Color.status.error : '#666')};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover:not(:disabled) {
    background: ${({ $tone }) => ($tone === 'blue' ? '#2d8cf0' : $tone === 'danger' ? Color.status.error : Color.text.secondary)};
    color: #fff;
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const GenerateForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Field = styled.div`
  label {
    display: block;
    font-size: ${FontSize.sm}px;
    color: ${Color.text.secondary};
    margin-bottom: 6px;
  }

  input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    font-size: ${FontSize.sm}px;
    border: 1px solid ${Color.border.medium};
    border-radius: ${Radius.input}px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: ${Color.primary};
      box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
    }
  }
`

const EmptyBox = styled.div`
  text-align: center;
  padding: 48px;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`

export default function AdminPromoCodes() {
  const { couponId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const cid = Number(couponId)
  const [list, setList] = useState<PromoCodeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showGenerate, setShowGenerate] = useState(false)
  const [genForm, setGenForm] = useState({ count: 1, prefix: '', name: '', note: '' })
  const [genBusy, setGenBusy] = useState(false)

  const [qrTarget, setQrTarget] = useState<PromoCodeItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PromoCodeItem | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminAPI.getPromoDashboard(cid)
      setList(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [cid])

  useEffect(() => {
    if (cid) fetchList()
  }, [cid, fetchList])

  const shareUrl = (code: string) => `https://www.ziggner.com/coupon/${code}`

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(code))
      toast.success('直达链接已复制')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleToggle = async (item: PromoCodeItem) => {
    setBusyId(item.id)
    try {
      await adminAPI.updatePromoCode(item.id, { is_active: !item.is_active })
      toast.success(item.is_active ? '已停用' : '已启用')
      fetchList()
    } catch {
      toast.error('操作失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminAPI.deletePromoCode(deleteTarget.id)
      toast.success('已删除')
      setDeleteTarget(null)
      fetchList()
    } catch {
      toast.error('删除失败')
    }
  }

  const handleGenerate = async () => {
    const count = Math.min(200, Math.max(1, Number(genForm.count) || 1))
    const prefix = genForm.prefix.toUpperCase().slice(0, 8)
    setGenBusy(true)
    try {
      await adminAPI.createPromoCodes(cid, { count, prefix, name: genForm.name, note: genForm.note })
      toast.success(`已生成 ${count} 个推广码`)
      setShowGenerate(false)
      setGenForm({ count: 1, prefix: '', name: '', note: '' })
      fetchList()
    } catch (e: any) {
      toast.error(e?.message || '生成失败')
    } finally {
      setGenBusy(false)
    }
  }

  const sum = (fn: (i: PromoCodeItem) => number) => list.reduce((s, i) => s + (Number(fn(i)) || 0), 0)

  // 参数无效：直接提示返回，避免白屏/静默空态
  if (!cid) {
    return (
      <div>
        <PageHeader
          title="代言人券 · 推广码看板"
          actions={<RowBtn onClick={() => navigate('/admin/coupons')}>返回优惠券</RowBtn>}
        />
        <EmptyBox>推广码参数缺失或无效（couponId），请从优惠券列表的「推广码」按钮进入。</EmptyBox>
      </div>
    )
  }

  const couponCode = list[0]?.coupon_code

  return (
    <div>
      <PageHeader
        title="代言人券 · 推广码看板"
        breadcrumb={[{ label: t('admin.coupons.title'), path: '/admin/coupons' }, { label: `推广码 · 优惠券 ${couponCode ?? `#${cid}`}` }]}
        actions={
          <>
            <RowBtn onClick={() => navigate('/admin/coupons')}>返回优惠券</RowBtn>
            <RowBtn $tone="blue" onClick={() => setShowGenerate(true)}>生成推广码</RowBtn>
          </>
        }
      />

      {error ? (
        <EmptyBox>{error}
          <div style={{ marginTop: 8 }}>
            <RowBtn onClick={fetchList}>重试</RowBtn>
          </div>
        </EmptyBox>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 56, borderRadius: 8, background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyBox>暂无推广码，点击右上角「生成推广码」创建</EmptyBox>
      ) : (
        <TableScroll>
          <Table>
            <thead>
              <tr>
                <th>券码</th>
                <th>状态</th>
                <th style={{ textAlign: 'right' }}>领取数</th>
                <th style={{ textAlign: 'right' }}>去重用户</th>
                <th style={{ textAlign: 'right' }}>已支付订单</th>
                <th style={{ textAlign: 'right' }}>GMV</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id}>
                  <td><Mono>{item.code}</Mono></td>
                  <td><StatusPill $active={item.is_active}>{item.is_active ? '启用' : '停用'}</StatusPill></td>
                  <td style={{ textAlign: 'right' }}>{item.claim_count ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>{item.unique_users ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>{item.paid_order_count ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>¥{Number(item.gmv ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <RowBtn onClick={() => setQrTarget(item)}>二维码</RowBtn>
                      <RowBtn onClick={() => copyLink(item.code)}>复制链接</RowBtn>
                      <RowBtn disabled={busyId === item.id} onClick={() => handleToggle(item)}>
                        {item.is_active ? '停用' : '启用'}
                      </RowBtn>
                      <RowBtn $tone="danger" onClick={() => setDeleteTarget(item)}>删除</RowBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>合计</td>
                <td></td>
                <td style={{ textAlign: 'right' }}>{sum(i => i.claim_count ?? 0)}</td>
                <td style={{ textAlign: 'right' }}>{sum(i => i.unique_users ?? 0)}</td>
                <td style={{ textAlign: 'right' }}>{sum(i => i.paid_order_count ?? 0)}</td>
                <td style={{ textAlign: 'right' }}>¥{sum(i => Number(i.gmv ?? 0)).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        </TableScroll>
      )}

      {/* 生成推广码 */}
      <Modal
        open={showGenerate}
        title="生成推广码"
        width="560px"
        okText="生成"
        onOk={handleGenerate}
        onClose={() => setShowGenerate(false)}
        confirmLoading={genBusy}
      >
        <GenerateForm>
          <Field>
            <label>生成数量（1–200）</label>
            <input
              type="number"
              min={1}
              max={200}
              value={genForm.count}
              onChange={e => setGenForm(f => ({ ...f, count: Number(e.target.value) }))}
            />
          </Field>
          <Field>
            <label>前缀（≤8 位大写，选填）</label>
            <input
              value={genForm.prefix}
              onChange={e => setGenForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
              placeholder="如 TB"
            />
          </Field>
          <Field>
            <label>名称（选填）</label>
            <input value={genForm.name} onChange={e => setGenForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field>
            <label>备注（选填）</label>
            <input value={genForm.note} onChange={e => setGenForm(f => ({ ...f, note: e.target.value }))} />
          </Field>
        </GenerateForm>
      </Modal>

      {/* 二维码 */}
      <Modal open={!!qrTarget} title="推广码二维码" width="360px" onClose={() => setQrTarget(null)} footer={null}>
        {qrTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <QRCodeSVG value={shareUrl(qrTarget.code)} size={200} />
            <Mono>{qrTarget.code}</Mono>
            <span style={{ fontSize: 12, color: Color.text.muted }}>{shareUrl(qrTarget.code)}</span>
          </div>
        )}
      </Modal>

      {/* 删除确认 */}
      {deleteTarget && (
        <ConfirmDialog
          title="删除推广码"
          message={`确定删除推广码 ${deleteTarget.code} 吗？此操作不可撤销。`}
          confirmLabel="确认删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
