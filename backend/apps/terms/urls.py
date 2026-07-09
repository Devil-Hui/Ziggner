from django.urls import path
from .views import ActiveTermListView, TermByTypeView, AdminTermListView, AdminTermDetailView

urlpatterns = [
    # 公开接口
    path('', ActiveTermListView.as_view(), name='terms-active'),
    path('<str:term_type>/', TermByTypeView.as_view(), name='terms-by-type'),
    # 管理员接口（需 admin token）
    path('admin/', AdminTermListView.as_view(), name='terms-admin-list'),
    path('admin/<int:pk>/', AdminTermDetailView.as_view(), name='terms-admin-detail'),
]
