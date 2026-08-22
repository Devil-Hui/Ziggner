"""活动批量关联 SKU 解析：按 标签 / 分类（含子级） / 全站 三种 scope 解析出 SKU 列表。

供 promotion.admin_views.ActivitySKUView 使用；集中在此便于复用与单测。

三种 scope：
- tag      ：按活动/商品标签（SPUTagRelation）解析
- category ：按一级目录递归含全部子分类解析
- all      ：全站有效（未删除）商品
"""


def resolve_scope_spu_ids(scope_type: str, scope: dict) -> list[int]:
    """按 scope 解析出 SPU id 列表（不做上下架过滤，由调用方决定）。"""
    from .models import SPU, SPUTagRelation, Category

    if scope_type == 'tag':
        tag_id = scope.get('tag_id')
        if not tag_id:
            return []
        try:
            tag_id = int(tag_id)
        except (TypeError, ValueError):
            return []
        return list(
            SPUTagRelation.objects.filter(tag_id=tag_id)
            .values_list('spu_id', flat=True)
        )
    if scope_type == 'category':
        cat_id = scope.get('category_id')
        if not cat_id:
            return []
        try:
            root = Category.objects.get(id=int(cat_id))
        except (Category.DoesNotExist, TypeError, ValueError):
            return []
        # 递归收集该分类及其全部子分类
        ids = [root.id]
        stack = [root]
        while stack:
            node = stack.pop()
            children = list(node.children.all())
            ids.extend(c.id for c in children)
            stack.extend(children)
        return list(
            SPU.objects.filter(category_id__in=ids, deleted_at__isnull=True)
            .values_list('id', flat=True)
        )
    # 'all'：全站有效商品
    return list(
        SPU.objects.filter(deleted_at__isnull=True).values_list('id', flat=True)
    )


def resolve_scope_sku_ids(scope_type: str, scope: dict) -> list[int]:
    """返回匹配 scope 的 SKU id 列表（仅上架 SKU，上限 2000 防误操作）。"""
    from .models import SKU

    spu_ids = resolve_scope_spu_ids(scope_type, scope)
    if not spu_ids:
        return []
    return list(
        SKU.objects.filter(spu_id__in=spu_ids, shelf_status='on')
        .values_list('id', flat=True)[:2000]
    )


def resolve_scope_sku_items(scope_type: str, scope: dict, preview_limit: int = 10) -> dict:
    """解析 scope 并返回 {count, items}（不落库，供解析预览 / 关联列表展示）。

    - count：实际将关联的 SKU 数量（与 resolve_scope_sku_ids 一致，上限 2000）
    - items：前 preview_limit 条 SKU 详情样例（含商品名 / 原价 / 状态）
    """
    from .models import SKU

    spu_ids = resolve_scope_spu_ids(scope_type, scope)
    if not spu_ids:
        return {'count': 0, 'items': []}
    qs = (
        SKU.objects.filter(spu_id__in=spu_ids, shelf_status='on')
        .select_related('spu')
        .order_by('-id')
    )
    count = min(qs.count(), 2000)
    items = [{
        'sku_id': s.id,
        'sku_code': s.sku_code,
        'spu_id': s.spu_id,
        'spu_name': s.spu.name,
        'price': str(s.price),
        'spu_status': s.spu.status,
        'sku_shelf_status': s.shelf_status,
    } for s in qs[:preview_limit]]
    return {'count': count, 'items': items}
