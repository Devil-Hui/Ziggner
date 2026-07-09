# Order API

Base: `/api/order/`

需登录。

---

## 1. 结算下单

**POST** `/api/order/checkout/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `cart_item_ids` | list[int] | yes | 购物车项 ID，max **50** 个 |
| `shipping_name` | string | yes | 收货人, max 50 |
| `shipping_phone` | string | yes | 电话, max 20 |
| `shipping_address` | JSON | yes | 收货地址 |
| `payment_method` | string | no | 支付方式 |
| `buyer_remark` | string | no | 备注, max 500 |
| `coupon_code` | string | no | 优惠券码 |

Response `201`: 订单详情（含 items + after_sales + currency）。

---

## 2. 订单列表

**GET** `/api/order/`

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `status` | string | no | — | 筛选：`pending_payment` / `paid` / `shipped` / `delivered` / `completed` / `cancelled` |
| `page` | int | no | 1 | 页码 |
| `per_page` | int | no | 15 | 每页条数，最大 100 |

Response `200`: `{"count": N, "results": [...]}`，每条含 `item_count`。

---

## 3. 订单详情

**GET** `/api/order/{order_no}/`

---

## 4. 取消订单

**POST** `/api/order/{order_no}/cancel/`

仅 `pending_payment` / `paid` 可取消。已付款取消自动恢复库存。

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | no | 取消原因, max 500 |

---

## 5. 确认收货

**POST** `/api/order/{order_no}/confirm/`

---

## 状态流转

```
Pending Payment → Paid → Shipped → Delivered → Completed
       │              │
       └──cancel──────┘
```
