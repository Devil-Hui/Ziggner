# Favorite API

Base: `/api/lovegoods/`

需登录。每个用户最多 **200** 个收藏。

---

## 1. 收藏列表

**GET** `/api/lovegoods/`

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | int | no | 1 | 页码 |
| `per_page` | int | no | 15 | 每页条数，最大 100 |

Response `200`:
```json
{
  "count": 5,
  "results": [{
    "id": 1, "spu_id": 10,
    "spu_name": "iPhone 15",
    "spu_image": "/media/products/iphone.jpg",
    "min_price": 5999.00,
    "created_at": "2026-06-04T..."
  }]
}
```

---

## 2. 收藏 / 取消收藏

**POST** `/api/lovegoods/{spu_id}/`

已收藏则取消，未收藏则添加。

Response `200`:
```json
{"spu_id": 10, "favorited": true}
```
`favorited`: `true` 已收藏 / `false` 已取消。

超过 200 个返回 400。
