"""活动批量关联 SKU 解析（9.1）：按 标签 / 分类（含子级） / 全站 三种 scope 解析出 SKU 列表。

供 promotion.admin_views.ActivitySKUView 使用；集中在此便于复用与单测。
"""


def resolve_scope_sku_ids(scope_type: str, scope: dict) -> list[int]:
    """返回匹配 scope 的 SKU id 列表（仅启用且上架的 SKU，上限 2000 防误操作）。"""
    from .models import SPU, SKU, SPUTagRelation, Category

    if scope_type == 'tag':
        tag_id = scope.get('tag_id')
        if not tag_id:
            return []
        try:
            tag_id = int(tag_id)
        except (TypeError, ValueError):
            return []
        spu_ids = list(
            SPUTagRelation.objects.filter(tag_id=tag_id)
            .values_list('spu_id', flat=True)
        )
    elif scope_type == 'category':
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
        spu_ids = list(
            SPU.objects.filter(category_id__in=ids, deleted_at__isnull=True)
            .values_list('id', flat=True)
        )
    else:  # 'all'：全站有效商品
        spu_ids = list(
            SPU.objects.filter(deleted_at__isnull=True).values_list('id', flat=True)
        )

    if not spu_ids:
        return []
    return list(
        SKU.objects.filter(spu_id__in=spu_ids, shelf_status='on')
        .values_list('id', flat=True)[:2000]
    )
