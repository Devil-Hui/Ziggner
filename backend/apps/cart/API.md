# Cart API

Base: `/api/cart/`

需登录。每个用户最多 **100** 个购物车项。

---

## 1. 购物车列表

**GET** `/api/cart/`

Response `200`:
```json
[{
  "id": 1, "sku_id": 10, "sku_code": "IP15-BLK-128",
  "spu_name": "iPhone 15", "price": "5999.00", "stock": 100,
  "spec_values": [{"spec_name": "Color", "spec_value": "Black"}],
  "quantity": 2, "selected": true
}]
```

---

## 2. 添加商品

**POST** `/api/cart/items/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sku_id` | int | yes | SKU ID |
| `quantity` | int | no | 数量, default 1, max 999 |

同 SKU 已存在则累加。新增项超过 100 个返回 400。

---

## 3. 修改数量

**PATCH** `/api/cart/items/{item_id}/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `quantity` | int | yes | 新数量, 0 则删除 |

---

## 4. 删除

**DELETE** `/api/cart/items/{item_id}/`

---

## 5. 批量勾选

**POST** `/api/cart/items/select/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `item_ids` | list[int] | yes | 要勾选的 ID 列表，空则全取消 |
