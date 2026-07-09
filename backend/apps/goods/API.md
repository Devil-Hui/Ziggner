# Goods API

Base: `/api/goods/`

All GET endpoints are public (`AllowAny`).

---

## 1. Category Tree

**GET** `/api/goods/categories/`

获取三级分类树。

| Param | Type | Required | In | Description |
|-------|------|----------|-----|-------------|
| — | — | — | — | No parameters |

Response `200`:
```json
[{
  "id": 1,
  "name": "Electronics",
  "level": 1,
  "sort_order": 0,
  "children": [{
    "id": 2,
    "name": "Phones",
    "level": 2,
    "sort_order": 0,
    "children": []
  }]
}]
```

---

## 2. Brand List

**GET** `/api/goods/brands/`

获取全部启用品牌。

| Param | Type | Required | In | Description |
|-------|------|----------|-----|-------------|
| — | — | — | — | No parameters |

Response `200`:
```json
[{"id": 1, "name": "Apple", "logo": "/media/...", "description": "...", "sort_order": 0, "is_active": true}]
```

---

## 3. SPU Detail

**GET** `/api/goods/spus/<spu_id>/`

获取 SPU 详情（含嵌套品牌、分类、规格、属性、SKU 列表）。

| Param | Type | Required | In | Description |
|-------|------|----------|-----|-------------|
| `spu_id` | int | yes | path | SPU ID, must be ≥ 1 |

Response `200`:
```json
{
  "id": 1,
  "name": "iPhone 15",
  "brand": {"id": 1, "name": "Apple", "logo": "..."},
  "category": {"id": 2, "name": "Phones", "level": 2},
  "description": "...",
  "main_image": "/media/...",
  "attributes": [{"name": "Screen Size", "values": ["6.1 inch"]}],
  "specs": [{"name": "Color", "values": ["Black", "White"]}],
  "skus": [{
    "id": 1,
    "sku_code": "IP15-BLK-128",
    "price": "5999.00",
    "stock": 100,
    "sales": 50,
    "weight": "173.00",
    "image": "",
    "spec_values": [{"spec_name": "Color", "spec_value": "Black"}]
  }],
  "is_active": true,
  "created_at": "2026-05-30T..."
}
```

---

## 4. SKU Detail

**GET** `/api/goods/skus/<sku_id>/`

获取 SKU 详情（含所属 SPU、规格值组合）。

| Param | Type | Required | In | Description |
|-------|------|----------|-----|-------------|
| `sku_id` | int | yes | path | SKU ID, must be ≥ 1 |

Response `200`:
```json
{
  "id": 1,
  "sku_code": "IP15-BLK-128",
  "price": "5999.00",
  "stock": 100,
  "sales": 50,
  "weight": "173.00",
  "image": "",
  "spec_values": [{"spec_name": "Color", "spec_value": "Black"}]
}
```

---

## 5. Hot Products

**GET** `/api/goods/hot/`

获取热销商品排行（基于销量 Redis ZSET）。

| Param | Type | Required | In | Description |
|-------|------|----------|-----|-------------|
| `category_id` | int | no | query | 按分类筛选，不传则返回全站热销 |

Response `200`:
```json
[{
  "id": 1,
  "sku_code": "IP15-BLK-128",
  "price": "5999.00",
  "stock": 100,
  "sales": 50,
  "weight": "173.00",
  "image": "",
  "spec_values": [{"spec_name": "Color", "spec_value": "Black"}]
}]
```

---

## 6. Product Search

**GET** `/api/goods/search/`

全文检索 + 分面筛选。限流：60 req/min。

| Param | Type | Required | In | Description |
|-------|------|----------|-----|-------------|
| `q` | string | no | query | Search keyword, max 200 chars |
| `category_id` | int | no | query | Category filter, min 1 |
| `brand_id` | int | no | query | Brand filter, min 1 |
| `price_min` | float | no | query | Min price, min 0 |
| `price_max` | float | no | query | Max price, min 0 |
| `in_stock` | bool | no | query | Only items in stock |
| `sort` | string | no | query | `price_asc` / `price_desc` / `sales_desc` / `newest` / `relevance` |
| `page` | int | no | query | Page number, default 1, min 1 |
| `per_page` | int | no | query | Items per page, default 15, max 100 |

Response `200`:
```json
{
  "count": 142,
  "page": 1,
  "per_page": 20,
  "results": [{
    "name": "iPhone 15",
    "brand_id": 1,
    "brand_name": "Apple",
    "category_id": 2,
    "category_path": "1/2",
    "min_price": 5999.0,
    "max_price": 8999.0,
    "total_stock": 500,
    "total_sales": 1200,
    "main_image": "/media/...",
    "is_active": true
  }],
  "facets": {
    "by_brand": [{"id": 1, "count": 45}],
    "by_category": [{"id": 2, "count": 120}],
    "price_ranges": [{"key": "100.0-500.0", "count": 30}]
  }
}
```

---

## 7. Search Suggestions

**GET** `/api/goods/search/suggest/`

搜索自动补全。限流：60 req/min。

| Param | Type | Required | In | Description |
|-------|------|----------|-----|-------------|
| `q` | string | yes | query | Search prefix, min 2 chars, auto-truncated to 50 |

Response `200`:
```json
["iPhone 15", "iPhone 14", "iPad Pro"]
```

---

## 15. Product Shopify Fields (新增)

### SPU 字段（`POST /api/goods/spu/create` / `PUT /api/goods/spu/<id>/update`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `meta_title` | string(120) | 否 | SEO 标题 |
| `meta_description` | text(320) | 否 | SEO 描述 |
| `product_type` | string(100) | 否 | 商品类型 |
| `tags` | json list | 否 | 标签列表 |
| `requires_shipping` | bool | 否 | 需物流（默认 true） |
| `taxable` | bool | 否 | 需计税（默认 true） |
| `product_kind` | enum(physical/virtual) | 否 | 实体/虚拟商品（默认 physical） |

### SKU 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sku_code` | string(64) | 否 | SKU 编码 |
| `barcode` | string(128) | 否 | 条形码 UPC/EAN/ISBN |
| `weight` | decimal(8,2) | 否 | 重量 (克) |
| `cost_price` | decimal(10,2) | 否 | 成本价 |

### 行为

- `product_kind=virtual` 时前端 **隐藏** 媒体上传区域（商品无物流）
- 标签通过 `tags` 数组传递（前端用逗号分隔输入）
- 媒体上传：`POST /api/goods/upload/image` 返回 `original_url` 等 4 尺寸 URL

### 迁移

- `0015_shopify_fields.py` — SPU/SKU 新字段
- `0016_product_kind.py` — 实体/虚拟开关
