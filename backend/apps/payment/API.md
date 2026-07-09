# Payment API [测试中]

> ⚠️ 支付模块仍在测试阶段，接口可能调整。

Base: `/api/payment/`

支持 Stripe / PayPal / Alipay。

---

## 1. 发起支付（需登录）

**POST** `/api/payment/create/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `order_no` | string | yes | 订单号 |
| `method` | string | yes | 支付方式：`paypal` / `stripe` / `alipay` |
| `success_url` | string | no | 支付成功跳转地址 |
| `cancel_url` | string | no | 取消支付跳转地址 |

Response `200`:
```json
{
  "payment_no": "20260604120001...",
  "pay_url": "https://www.paypal.com/checkoutnow?token=...",
  "client_secret": "pi_xxx_secret"
}
```
- PayPal / Alipay → 返回 `pay_url`，前端跳转
- Stripe → 返回 `client_secret`，前端 Stripe Elements 渲染

Errors:
- `400` — 已支付 / 已取消 / 订单状态不允许 / 不支持的支付方式
- `404` — 订单不存在

---

## 2. 支付网关回调（公开）

**POST** `/api/payment/webhook/{gateway}/`

由 Stripe/PayPal/Alipay 异步回调，不需要登录。

Header:
- Stripe: `Stripe-Signature`
- PayPal: `X-Paypal-Transmission-Sig`
- Alipay: `X-Signature`

安全校验：签名验证 → 幂等去重 → 币种 + 金额校验 → 更新订单状态。

Response `200`: `{"status": "success", "payment_no": "..."}`

---

## 3. 查询支付状态（需登录）

**GET** `/api/payment/status/{order_no}/`

前端轮询获取支付结果。

Response `200`:
```json
{
  "paid": true,
  "status": "success",
  "method": "paypal",
  "payment_no": "20260604120001...",
  "amount": 99.99,
  "currency": "USD"
}
```
