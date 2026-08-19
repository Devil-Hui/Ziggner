from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.core.paginator import InvalidPage

import math

# 统一分页参数
PAGE_DEFAULT = 1
PER_PAGE_DEFAULT = 15
PER_PAGE_MAX = 100


def safe_int(value, default=0):
    """安全整数解析：None/空/非法输入回退默认值，杜绝 query 参数注入 ValueError → 500。"""
    try:
        if value is None or value == '':
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_pagination(request):
    """从请求中提取 page / per_page，统一默认值和上限。空值/非法值自动回退默认值。"""
    page = max(1, safe_int(request.query_params.get('page'), PAGE_DEFAULT))
    per_page = min(max(1, safe_int(request.query_params.get('per_page'), PER_PAGE_DEFAULT)), PER_PAGE_MAX)
    return page, per_page


class BasePagination(PageNumberPagination):
    page_size_query_param = 'per_page'
    page_size = PER_PAGE_DEFAULT
    max_page_size = PER_PAGE_MAX
    page = None
    over_page = False

    def paginate_queryset(self, queryset, request, view=None):
        self.request = request
        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = self.django_paginator_class(queryset, page_size)
        page_number = self.get_page_number(request, paginator)

        try:
            self.page = paginator.page(page_number)
        except InvalidPage as exc:
            self.page = paginator.page('1')
            self.over_page = True

        if paginator.num_pages > 1 and self.template is not None:
            # The browsable API should display pagination controls.
            self.display_page_controls = True

        return list(self.page)

    def get_paginated_response(self, data):
        if self.over_page:
            result = {
                'next': None,
                'previous': None,
                'count': self.page.paginator.count,
                'results': []
            }
        else:
            result = {
                'next': self.get_next_page_number(),
                'previous': self.get_previous_page_number(),
                'count': self.page.paginator.count,
                'results': data
            }
        return Response(result)

    def get_next_page_number(self):
        if not self.page.has_next():
            return None
        return self.page.next_page_number()

    def get_previous_page_number(self):
        if not self.page.has_previous():
            return None
        return self.page.previous_page_number()


class AdminPagination(BasePagination):
    max_page_size = 100  # 最大页大小限制