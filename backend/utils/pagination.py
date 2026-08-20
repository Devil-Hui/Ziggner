"""分页类 — 2C4G 资源约束下强制分页上限。

默认每页 20 条；客户端可通过 ?page_size= 调整，但硬上限 100，
防止一次拉取过多行撑爆单 gunicorn worker 内存。
"""

from rest_framework.pagination import PageNumberPagination


class CappedPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100  # 硬上限：2C4G 防一次拉爆内存
