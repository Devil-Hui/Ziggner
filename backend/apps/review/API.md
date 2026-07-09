# Review API

Base: `/api/review/`

---

## 1. SPU 评价列表（公开）

**GET** `/api/review/?spu_id=<id>`

无需登录。

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `spu_id` | int | **yes** | — | SPU ID |
| `page` | int | no | 1 | 页码 |
| `per_page` | int | no | 15 | 每页条数，最大 100 |

Response `200`:
```json
{
  "count": 12,
  "results": [{
    "id": 1,
    "username": "***",
    "spu_id": 1,
    "rating": 5,
    "content": "Great product!",
    "images": [],
    "is_anonymous": true,
    "created_at": "2026-06-04T..."
  }]
}
```

---

## 2. 创建评价（需登录）

**POST** `/api/review/create/`

限制：必须已购买该商品、订单已签收/已完成。同一订单项仅可评价一次。

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `spu_id` | int | yes | SPU ID |
| `order_item_id` | int | **yes** | 订单项 ID（关联购买记录） |
| `rating` | int | yes | 1-5 星 |
| `content` | string | no | 评价内容，max 2000 |
| `images` | list[url] | no | 晒图，max 5 张 |
| `is_anonymous` | bool | no | 匿名，default false |

Response `201`: Review object.

Errors:
- `400` — 未购买 / 订单未签收
- `409` — 已评价过

---

## 3. 我的评价（需登录）

**GET** `/api/review/my/`

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | int | no | 1 | 页码 |
| `per_page` | int | no | 15 | 每页条数，最大 100 |

Response `200`: 同结构。

---

## 4. 修改评价（需登录，仅一次）

**PATCH** `/api/review/{review_id}/`

创建后仅可修改一次。

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `rating` | int | no | 1-5 星 |
| `content` | string | no | 评价内容 |
| `images` | list[url] | no | 晒图，max 5 张 |
| `is_anonymous` | bool | no | 匿名 |

Response `200`: Review object.

Errors:
- `400` — 已修改过一次
- `404` — 评价不存在
