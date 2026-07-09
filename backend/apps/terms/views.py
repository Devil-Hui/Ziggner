from rest_framework.response import Response
from rest_framework import status
from utils.api_base_view import PublicApiView, AdminApiView
from utils.api_base_pagination import parse_pagination
from utils.response_codes import Messages
from .models import Term
from .serializers import TermSerializer, TermListSerializer


class ActiveTermListView(PublicApiView):
    """公开接口：获取所有生效中的条款（按类型分组的最新版本）"""

    def get(self, request):
        terms = Term.objects.filter(is_active=True)
        # 每种类型只取最新的一条
        latest_terms = {}
        for term in terms:
            t = term.type
            if t not in latest_terms or term.effective_date > latest_terms[t].effective_date:
                latest_terms[t] = term
        serializer = TermSerializer(list(latest_terms.values()), many=True)
        return Response({'code': 0, 'data': serializer.data})


class TermByTypeView(PublicApiView):
    """公开接口：按类型获取生效条款（如 /api/terms/privacy/）"""

    def get(self, request, term_type):
        term = Term.objects.filter(type=term_type, is_active=True).order_by('-effective_date').first()
        if not term:
            return Response({'code': 1, 'message': '条款不存在'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TermSerializer(term)
        return Response({'code': 0, 'data': serializer.data})


class AdminTermListView(AdminApiView):
    """管理员接口：条款列表（分页 + 按类型筛选）"""

    def get(self, request):
        page, page_size = parse_pagination(request, default_page_size=20)
        queryset = Term.objects.all()
        term_type = request.query_params.get('type')
        if term_type:
            queryset = queryset.filter(type=term_type)
        total = queryset.count()
        terms = queryset.order_by('-effective_date')[(page - 1) * page_size: page * page_size]
        serializer = TermListSerializer(terms, many=True)
        return Response({
            'code': 0,
            'data': {
                'items': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size,
            }
        })


class AdminTermDetailView(AdminApiView):
    """管理员接口：单个条款的 CRUD"""

    def get(self, request, pk):
        try:
            term = Term.objects.get(pk=pk)
        except Term.DoesNotExist:
            return Response({'code': 1, 'message': '条款不存在'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TermSerializer(term)
        return Response({'code': 0, 'data': serializer.data})

    def post(self, request):
        serializer = TermSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'code': 1, 'message': Messages.INVALID_DATA, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        term = serializer.save()
        return Response({'code': 0, 'data': TermSerializer(term).data}, status=status.HTTP_201_CREATED)

    def put(self, request, pk):
        try:
            term = Term.objects.get(pk=pk)
        except Term.DoesNotExist:
            return Response({'code': 1, 'message': '条款不存在'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TermSerializer(term, data=request.data, partial=False)
        if not serializer.is_valid():
            return Response({'code': 1, 'message': Messages.INVALID_DATA, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        term = serializer.save()
        return Response({'code': 0, 'data': TermSerializer(term).data})

    def delete(self, request, pk):
        try:
            term = Term.objects.get(pk=pk)
        except Term.DoesNotExist:
            return Response({'code': 1, 'message': '条款不存在'}, status=status.HTTP_404_NOT_FOUND)
        term.delete()
        return Response({'code': 0, 'message': '已删除'})
