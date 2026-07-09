# Notification API

Base: `/api/notification/`

需登录。

---

## 1. 通知列表

**GET** `/api/notification/`

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `unread` | string | no | — | `1` 只看未读 |
| `page` | int | no | 1 | 页码 |
| `per_page` | int | no | 15 | 每页条数，最大 100 |

Response `200`:
```json
{
  "count": 25, "unread": 3,
  "results": [{
    "id": 1, "type": "order_created", "title": "Order Placed",
    "content": "Your order #... has been placed.",
    "is_read": false, "related_order_no": "20260531123456",
    "created_at": "2026-06-04T..."
  }]
}
```

---

## 2. 单条已读

**POST** `/api/notification/{id}/read/`

---

## 3. 全部已读

**POST** `/api/notification/read-all/`

---

## 自动通知

| 事件 | 类型 |
|------|------|
| 下单 | `order_created` |
| 支付 | `order_paid` |
| 发货 | `order_shipped` |
| 签收 | `order_delivered` |
| 取消 | `order_cancelled` |
