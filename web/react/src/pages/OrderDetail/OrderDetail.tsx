import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { orderAPI, type Order } from '../../api/order';
import { paymentAPI } from '../../api/payment';
import { publicAPI } from '../../api/public';
import Button from '../../components/common/Button/Button';
import { Color, Radius, Spacing, FontSize } from '../../theme/tokens';
import { getOrderAmounts, getOrderItemImage, markOrderCancelled } from './orderDetailView';

interface OrderDetailProps {}

const OrderDetail: React.FC<OrderDetailProps> = () => {
  const { order_no } = useParams<{ order_no: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionMsgType, setActionMsgType] = useState<'success' | 'error'>('success');

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      if (!order_no) return;
      const data = await orderAPI.detail(order_no);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [order_no]);

  const loadRefunds = useCallback(async () => {
    try {
      const data = await paymentAPI.getRefunds();
      setRefunds(data.results || []);
    } catch (err) {
      console.error('Failed to load refunds:', err);
    }
  }, []);

  useEffect(() => {
    if (!order_no) return;
    void loadOrder();
    void loadRefunds();
  }, [order_no, loadOrder, loadRefunds]);

  // ── Cancel Order ──
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      await publicAPI.cancelOrder(order_no!, cancelReason);
      setOrder(current => current ? markOrderCancelled(current, cancelReason) : current);
      setActionMsg(t('store.orderDetail.cancelSuccess'));
      setActionMsgType('success');
      setCancelDialogOpen(false);
      setCancelReason('');
      await loadOrder();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.detail || err?.message || t('store.orderDetail.cancelFailed'));
      setActionMsgType('error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Request Refund ──
  const handleRequestRefund = async () => {
    if (!refundReason.trim()) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      await publicAPI.requestRefund(order_no!, refundReason);
      setActionMsg(t('store.payment.refundSuccess'));
      setActionMsgType('success');
      setRefundDialogOpen(false);
      setRefundReason('');
      await loadRefunds();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.detail || err?.message || t('store.payment.refundFailed'));
      setActionMsgType('error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: '#f39c12',
      pending_payment: '#f39c12',
      paid: '#3498db',
      processing: '#9b59b6',
      shipped: '#e67e22',
      delivered: '#2ecc71',
      completed: '#27ae60',
      cancelled: '#e74c3c',
    };
    return map[status] || '#95a5a6';
  };

  // Determine which actions are available
  const canCancel = order && !['cancelled', 'completed', 'delivered', 'shipped'].includes(order.status);
  const canRefund = order && ['paid', 'shipped', 'delivered'].includes(order.status);

  if (loading) return <div className="loading">{t('common.loading')}</div>;
  if (error) return <div className="error">{error}</div>;
  if (!order) return <div className="empty">{t('store.orderDetail.notFound')}</div>;

  const orderRefunds = refunds.filter((r: any) => r.payment?.order_no === order_no);
  const amounts = getOrderAmounts(order);
  const shippingAddress = order.shipping_address || {};

  // ── Dialog overlay & modal styles ──
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const dialogStyle: React.CSSProperties = {
    background: Color.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    width: 420,
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${Color.border.medium}`,
    borderRadius: Radius.sm,
    fontSize: FontSize.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div className="order-detail-page" style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
        ← {t('common.back')}
      </Button>

      <div className="order-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>{t('store.orderDetail.title')} #{order.order_no}</h2>
          <span style={{ color: '#7f8c8d', fontSize: 14 }}>{new Date(order.created_at).toLocaleString()}</span>
        </div>
        <span
          style={{
            background: getStatusColor(order.status),
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t(`store.orderDetail.status.${order.status}`)}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {order.status !== 'cancelled' && (
          <Button
            variant="primary"
            onClick={() => navigate(`/chat?order=${order_no}`)}
            style={{ background: '#3498db' }}
          >
            {t('store.product.contactSupport')}
          </Button>
        )}
        {canCancel && (
          <Button
            variant="primary"
            onClick={() => { setCancelDialogOpen(true); setActionMsg(''); }}
            style={{ background: '#e74c3c' }}
          >
            {t('store.orderDetail.cancelOrder')}
          </Button>
        )}
        {canRefund && (
          <Button
            variant="primary"
            onClick={() => { setRefundDialogOpen(true); setActionMsg(''); }}
            style={{ background: '#f39c12' }}
          >
            {t('store.orderDetail.requestRefund')}
          </Button>
        )}
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{
          background: actionMsgType === 'success' ? '#eafaf1' : '#fdedec',
          border: `1px solid ${actionMsgType === 'success' ? '#a3d9a5' : '#f5c6c6'}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          color: actionMsgType === 'success' ? '#2e7d32' : '#c0392b',
          fontSize: 14,
        }}>
          {actionMsg}
        </div>
      )}

      {/* Cancel Dialog */}
      {cancelDialogOpen && (
        <div style={overlayStyle} onClick={() => setCancelDialogOpen(false)}>
          <div style={dialogStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: FontSize.lg }}>{t('store.orderDetail.cancelOrder')}</h3>
            <p style={{ margin: '0 0 4px 0', color: Color.text.secondary, fontSize: FontSize.sm }}>
              {t('store.orderDetail.cancelPrompt')}
            </p>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' } as React.CSSProperties}
              placeholder={t('store.orderDetail.cancelPlaceholder')}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={actionLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCancelOrder}
                disabled={actionLoading || !cancelReason.trim()}
                style={{ background: '#e74c3c' }}
              >
                {actionLoading ? t('common.submitting') : t('store.orderDetail.confirmCancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Dialog */}
      {refundDialogOpen && (
        <div style={overlayStyle} onClick={() => setRefundDialogOpen(false)}>
          <div style={dialogStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: FontSize.lg }}>{t('store.payment.requestRefund')}</h3>
            <p style={{ margin: '0 0 4px 0', color: Color.text.secondary, fontSize: FontSize.sm }}>
              {t('store.orderDetail.refundPrompt')}
            </p>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' } as React.CSSProperties}
              placeholder={t('store.payment.refundReasonPlaceholder')}
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => setRefundDialogOpen(false)}
                disabled={actionLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleRequestRefund}
                disabled={actionLoading || !refundReason.trim()}
              >
                {actionLoading ? t('common.submitting') : t('store.payment.submitRefund')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 退款状态 */}
      {orderRefunds.length > 0 && (
        <div className="refund-section" style={{ background: '#fff5f5', border: '1px solid #f5c6c6', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#c0392b' }}>{t('store.orderDetail.refundTitle')}</h3>
          {orderRefunds.map((refund: any) => (
            <div key={refund.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <div>
                <span style={{ fontWeight: 600 }}>{t('store.orderDetail.refundStatus.' + refund.status)}</span>
                <span style={{ color: '#7f8c8d', fontSize: 12, marginLeft: 8 }}>
                  {new Date(refund.created_at).toLocaleString()}
                </span>
              </div>
              <span style={{ fontWeight: 600, color: '#c0392b' }}>
                -¥{parseFloat(refund.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 收货地址 */}
      <div className="section" style={{ background: '#fff', border: '1px solid #ecf0f1', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>{t('store.orderDetail.shippingAddress')}</h3>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {order.shipping_name} {order.shipping_phone}<br />
          {shippingAddress.country} {shippingAddress.region} {shippingAddress.city}<br />
          {shippingAddress.address_line}
        </p>
      </div>

      {/* 商品列表 */}
      <div className="section" style={{ background: '#fff', border: '1px solid #ecf0f1', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>{t('store.orderDetail.items')}</h3>
        {order.items.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            {getOrderItemImage(item.image_url) && (
              <img
                src={getOrderItemImage(item.image_url)}
                alt={item.spu_name}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.spu_name}</div>
              {item.spec_snapshot.length > 0 && (
                <div style={{ color: '#7f8c8d', fontSize: 12 }}>
                  {item.spec_snapshot.map(spec => `${spec.spec_name}: ${spec.spec_value}`).join(' · ')}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span>¥{parseFloat(item.price).toFixed(2)} × {item.quantity}</span>
                <span style={{ fontWeight: 600 }}>¥{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 订单金额 */}
      <div className="section" style={{ background: '#fff', border: '1px solid #ecf0f1', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>{t('store.orderDetail.subtotal')}</span>
          <span>¥{amounts.subtotal.toFixed(2)}</span>
        </div>
        {amounts.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#e74c3c' }}>
            <span>{t('store.orderDetail.discount')}</span>
            <span>-¥{amounts.discount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: '1px solid #ecf0f1', paddingTop: 12, marginTop: 12 }}>
          <span>{t('store.orderDetail.total')}</span>
          <span>¥{amounts.payable.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
