# Address API

Base: `/api/address/`

需登录。每个用户最多 **20** 个地址。

---

## 1. 地址列表 / 新增

**GET** `/api/address/`

Response `200`:
```json
[{
  "id": 1, "name": "John", "phone": "13800138000",
  "country": "China", "region": "Zhejiang", "city": "Hangzhou",
  "address_line": "Xihu District, Wenyi Road 100", "postal_code": "310000",
  "is_default": true, "created_at": "...", "updated_at": "..."
}]
```

**POST** `/api/address/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | 收货人, max 50 |
| `phone` | string | yes | 电话, max 20 |
| `country` | string | no | 国家, default "China" |
| `region` | string | yes | 州/省, max 100 |
| `city` | string | yes | 城市, max 100 |
| `address_line` | string | yes | 详细地址, max 300 |
| `postal_code` | string | no | 邮编 |
| `is_default` | bool | no | 默认地址 |

Response `201`: 地址对象。上限 20 个，超出返回 400。

---

## 2. 地址详情 / 修改 / 删除

**GET** `/api/address/{id}/`

**PATCH** `/api/address/{id}/`

部分更新，所有字段可选。

**DELETE** `/api/address/{id}/`

删默认地址后自动将下一个设为默认。

---

## 3. 默认地址

**GET** `/api/address/default/`

**POST** `/api/address/{id}/default/` — 设为默认
