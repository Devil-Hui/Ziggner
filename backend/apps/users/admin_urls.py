from django.urls import path

from apps.users.admin_views import (
    AdminUserCreateView,
    AdminUserListView,
    AdminUserRoleView,
)

urlpatterns = [
    # 超管创建/开通管理员候选账号（与 /api/users/register 自助注册分离）
    path('create/', AdminUserCreateView.as_view(), name='admin-user-create'),
    # 按 account_no / role 检索（不暴露内部 id）
    path('', AdminUserListView.as_view(), name='admin-user-list'),
    # 按 account_no 指派可指派角色
    path('<str:account_no>/roles', AdminUserRoleView.as_view(), name='admin-user-roles'),
]
