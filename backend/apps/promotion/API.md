# Promotion API

Base: `/api/promotion/`

---

## 1. 可领取券（公开）

**GET** `/api/promotion/`

无需登录。

Response `200`:
```json
[{
  "id": 1, "name": "Summer 20% Off", "code": "SUMMER20",
  "type": "percent", "value": 20.00, "min_amount": 50.00,
  "max_discount": 30.00, "remaining": 500,
  "start_time": "2026-06-01T...", "end_time": "2026-08-31T..."
}]
```

---

## 2. 我的券（需登录）

**GET** `/api/promotion/my/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | no | `unused` / `used` / `expired` |

---

## 3. 领取（需登录）

**POST** `/api/promotion/{code}/claim/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | yes | 券码 |

---

## 4. 生成券 [测试中]

**POST** `/api/promotion/generate/`

> ⚠️ 开发中，暂不可用
